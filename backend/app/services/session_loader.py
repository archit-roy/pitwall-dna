import fastf1
import pandas as pd
from pathlib import Path
from app.core.config import settings

# Tell FastF1 where to store downloaded session data
Path(settings.F1_CACHE_DIR).mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(settings.F1_CACHE_DIR)

# Maps team names to their official colors
TEAM_COLORS = {
    "Red Bull Racing": "#3671C6",
    "Mercedes":        "#27F4D2",
    "Ferrari":         "#E8002D",
    "McLaren":         "#FF8000",
    "Aston Martin":    "#229971",
    "Alpine":          "#FF87BC",
    "Williams":        "#64C4FF",
    "RB":              "#6692FF",
    "Haas F1 Team":    "#B6BABD",
    "Sauber":          "#52E252",
}


def get_team_color(team: str) -> str:
    for key, color in TEAM_COLORS.items():
        if key.lower() in team.lower():
            return color
    return "#888888"


def load_session(year: int, round_num: int, session_type: str):
    """Load a session with full telemetry from FastF1."""
    session = fastf1.get_session(year, round_num, session_type)
    session.load(telemetry=True, weather=True, messages=False)
    return session


def get_event_schedule(year: int) -> list[dict]:
    """Return all rounds for a season."""
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    rounds = []
    for _, row in schedule.iterrows():
        rounds.append({
            "round":      int(row["RoundNumber"]),
            "event_name": row["EventName"],
            "circuit":    row.get("Location", ""),
            "country":    row.get("Country", ""),
            "date":       str(row["EventDate"].date()),
        })
    return rounds


def get_drivers_in_session(session) -> list[dict]:
    """Extract driver info from a loaded session."""
    drivers = []
    for drv_num in session.drivers:
        drv = session.get_driver(drv_num)
        team = drv.get("TeamName", "Unknown")
        drivers.append({
            "code":       drv.get("Abbreviation", str(drv_num)),
            "full_name":  drv.get("FullName", "Unknown"),
            "team":       team,
            "team_color": get_team_color(team),
            "number":     int(drv_num) if str(drv_num).isdigit() else 0,
        })
    return sorted(drivers, key=lambda d: d["code"])


def get_clean_laps(session, driver_code: str) -> pd.DataFrame:
    """Return fast, clean laps for a driver — no pit laps, no outliers."""
    laps = session.laps.pick_drivers(driver_code)
    laps = laps.pick_quicklaps(settings.OUTLIER_LAP_THRESHOLD)
    laps = laps[laps["LapTime"].notna()].copy()
    return laps


def get_multi_lap_telemetry(session, driver_code: str) -> list[tuple]:
    """
    Return telemetry for the N fastest clean laps.
    Each item is a (telemetry_dataframe, lap_time_seconds) tuple.
    """
    laps = get_clean_laps(session, driver_code)
    if laps.empty:
        raise ValueError(f"No clean laps found for {driver_code}")

    best_laps = laps.sort_values("LapTime").head(settings.MIN_LAPS_FOR_DNA)
    results = []
    for _, lap in best_laps.iterrows():
        try:
            tel = lap.get_telemetry().add_distance()
            lap_time = lap["LapTime"].total_seconds()
            results.append((tel, lap_time))
        except Exception:
            pass
    return results