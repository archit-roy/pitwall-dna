import numpy as np
import pandas as pd
from scipy.signal import find_peaks
from app.core.config import settings
from app.services.session_loader import (
    get_multi_lap_telemetry,
    get_team_color,
)

RES = settings.SIGNATURE_RESOLUTION


def interpolate_to_grid(tel: pd.DataFrame) -> dict:
    """
    Resample all telemetry channels onto a uniform
    distance grid of RES points.
    """
    dist = tel["Distance"].values.astype(float)
    grid = np.linspace(dist[0], dist[-1], RES)

    out = {"Distance": grid}

    channels = ["Throttle", "Brake", "Speed", "nGear", "RPM", "DRS"]
    for col in channels:
        if col in tel.columns:
            values = tel[col].values.astype(float)
            # Fill any NaN gaps
            mask = np.isnan(values)
            if not mask.all():
                values[mask] = np.interp(
                    np.flatnonzero(mask),
                    np.flatnonzero(~mask),
                    values[~mask],
                )
            out[col] = np.interp(grid, dist, values)
        else:
            out[col] = np.zeros(RES)

    # Lateral G proxy — rate of speed change through corners
    speed = out["Speed"]
    lateral = np.abs(np.gradient(speed, grid))
    p95 = np.percentile(lateral, 95)
    out["LateralG"] = np.clip(lateral, 0, p95 * 2)

    return out


def average_grids(grids: list[dict]) -> dict:
    """Average multiple laps together to smooth out noise."""
    avg = {"Distance": grids[0]["Distance"]}
    for key in grids[0]:
        if key != "Distance":
            stacked = np.stack([g[key] for g in grids])
            avg[key] = np.mean(stacked, axis=0)
    return avg


def normalise(arr: np.ndarray) -> tuple:
    """Scale values to 0-1 range."""
    lo, hi = arr.min(), arr.max()
    if hi - lo < 1e-9:
        return np.zeros_like(arr), float(lo), float(hi)
    return (arr - lo) / (hi - lo), float(lo), float(hi)


def compute_style_dimensions(avg: dict) -> list[dict]:
    """
    Compute 8 style scores from the averaged telemetry.
    Each score is a float between 0 and 1.
    """
    throttle = avg["Throttle"]
    brake    = avg["Brake"]
    speed    = avg["Speed"]
    gear     = avg["nGear"]
    drs      = avg["DRS"]
    lateral  = avg["LateralG"]
    n        = len(throttle)

    # Corner mask — samples where lateral G is above 60th percentile
    corner_mask = lateral > np.percentile(lateral, 60)

    dims = {}

    # 1. How hard they brake in corners
    dims["late_braker"] = float(np.mean(brake[corner_mask])) if corner_mask.any() else 0.0

    # 2. How smoothly they apply throttle
    dthrottle = np.abs(np.diff(throttle))
    smoothness = 1.0 - float(np.std(dthrottle) / (np.mean(dthrottle) + 1e-6))
    dims["smooth_throttle"] = float(np.clip(smoothness, 0, 1))

    # 3. How much speed they carry through corners
    if corner_mask.any():
        dims["corner_speed"] = float(
            np.mean(speed[corner_mask]) / (np.max(speed) + 1e-6)
        )
    else:
        dims["corner_speed"] = 0.5

    # 4. How hard they hit the brakes at peak
    brake_thresh = np.percentile(brake, 90)
    heavy = brake[brake >= brake_thresh]
    dims["brake_pressure"] = float(np.mean(heavy)) if len(heavy) else 0.0

    # 5. Tendency to run higher gears
    dims["high_gear_preference"] = float(np.mean(gear) / 8.0)

    # 6. How often DRS is active
    dims["drs_aggression"] = float(np.mean((drs > 0).astype(float)))

    # 7. Braking while still turning into corner
    trail_mask = (brake > 0.1) & corner_mask
    dims["trail_braking"] = float(np.mean(trail_mask.astype(float)))

    # 8. How early they get back on throttle out of corners
    peaks, _ = find_peaks(lateral, distance=int(n * 0.05))
    exit_mask = np.zeros(n, dtype=bool)
    for pk in peaks:
        exit_mask[pk:min(pk + 30, n)] = True
    dims["power_on_exit"] = float(np.mean(throttle[exit_mask])) if exit_mask.any() else 0.5

    labels = {
        "late_braker":          "Late braker",
        "smooth_throttle":      "Throttle smoothness",
        "corner_speed":         "Corner speed",
        "brake_pressure":       "Brake pressure",
        "high_gear_preference": "High gear style",
        "drs_aggression":       "DRS aggression",
        "trail_braking":        "Trail braking",
        "power_on_exit":        "Exit power",
    }

    return [
        {"name": k, "label": labels[k], "value": float(np.clip(v, 0, 1))}
        for k, v in dims.items()
    ]


def detect_corners(avg: dict) -> list[tuple]:
    """Find corner windows using speed minima."""
    speed = avg["Speed"]
    min_sep = int(RES * 0.04)
    inv_speed = np.max(speed) - speed
    peaks, props = find_peaks(
        inv_speed,
        distance=min_sep,
        prominence=np.std(speed) * 0.3,
    )
    # Keep the 20 most prominent
    if len(peaks) > 20:
        order = np.argsort(props["prominences"])[::-1][:20]
        peaks = peaks[order]
        peaks.sort()

    width = int(RES * 0.05)
    return [(max(0, p - width), min(RES - 1, p + width)) for p in peaks]


def compute_corner_profiles(avg: dict) -> list[dict]:
    """Per-corner style breakdown."""
    corners = detect_corners(avg)
    dist     = avg["Distance"]
    speed    = avg["Speed"]
    brake    = avg["Brake"]
    throttle = avg["Throttle"]
    lateral  = avg["LateralG"]

    profiles = []
    for idx, (s, e) in enumerate(corners):
        mid = (s + e) // 2

        # Brake onset — first sample with brake > 0.2
        brake_onset = mid
        for i in range(s, e):
            if brake[i] > 0.2:
                brake_onset = i
                break

        exit_throttle = throttle[mid:e]
        throttle_app = float(np.mean(exit_throttle > 0.5)) if len(exit_throttle) else 0.0

        profiles.append({
            "corner_number":      idx + 1,
            "distance_start":     float(dist[s]),
            "distance_end":       float(dist[e]),
            "brake_point_offset": float((brake_onset - mid) / RES),
            "min_corner_speed":   float(np.min(speed[s:e])) if s < e else 0.0,
            "max_lateral_g":      float(np.max(lateral[s:e])) if s < e else 0.0,
            "throttle_application": throttle_app,
            "brake_pressure_peak":  float(np.max(brake[s:e])) if s < e else 0.0,
        })

    return profiles


def build_driver_dna(session, driver_code: str, session_key: str) -> dict:
    """Build the complete DNA profile for one driver."""
    lap_tels = get_multi_lap_telemetry(session, driver_code)
    if not lap_tels:
        raise ValueError(f"No usable telemetry for {driver_code}")

    grids = [interpolate_to_grid(tel) for tel, _ in lap_tels]
    avg   = average_grids(grids)
    best_lap_time = min(lt for _, lt in lap_tels)

    # Build signature channels
    channel_meta = [
        ("Throttle", "Throttle",   "%"),
        ("Brake",    "Brake",      "%"),
        ("Speed",    "Speed",      "km/h"),
        ("nGear",    "Gear",       ""),
        ("LateralG", "Lateral G",  "G"),
        ("RPM",      "RPM",        "rpm"),
    ]
    channels = []
    for key, label, unit in channel_meta:
        raw = avg.get(key, np.zeros(RES))
        normed, raw_min, raw_max = normalise(raw)
        channels.append({
            "name":    key,
            "label":   label,
            "unit":    unit,
            "values":  normed.tolist(),
            "raw_min": raw_min,
            "raw_max": raw_max,
        })

    # Driver metadata
    try:
        d    = session.get_driver(driver_code)
        team = d.get("TeamName", "Unknown")
        full_name  = d.get("FullName", driver_code)
        team_color = get_team_color(team)
    except Exception:
        team = "Unknown"
        full_name  = driver_code
        team_color = "#888888"

    return {
        "driver_code":     driver_code,
        "full_name":       full_name,
        "team":            team,
        "team_color":      team_color,
        "session_key":     session_key,
        "laps_used":       len(lap_tels),
        "best_lap_time":   best_lap_time,
        "distance_meters": avg["Distance"].tolist(),
        "channels":        channels,
        "style_dimensions": compute_style_dimensions(avg),
        "corner_profiles":  compute_corner_profiles(avg),
    }