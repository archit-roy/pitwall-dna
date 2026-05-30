from fastapi import APIRouter, HTTPException, Query
from app.services.session_loader import (
    load_session,
    get_drivers_in_session,
)
from app.services.dna_analyzer import build_driver_dna
import numpy as np
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{year}/{round}/{session_type}/{driver}")
async def get_driver_dna(
    year: int,
    round: int,
    session_type: str,
    driver: str,
):
    try:
        session = load_session(year, round, session_type)
        key = f"{year}_{round}_{session_type}"
        dna = build_driver_dna(session, driver.upper(), key)
        return dna
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        logger.exception(f"DNA build failed for {driver}")
        raise HTTPException(500, str(e))


@router.get("/{year}/{round}/{session_type}")
async def get_session_dna(
    year: int,
    round: int,
    session_type: str,
    drivers: list[str] = Query(default=[]),
):
    try:
        session = load_session(year, round, session_type)
        key = f"{year}_{round}_{session_type}"

        if not drivers:
            all_drivers = get_drivers_in_session(session)
            drivers = [d["code"] for d in all_drivers]

        profiles = []
        for drv in drivers:
            try:
                dna = build_driver_dna(session, drv.upper(), key)
                profiles.append(dna)
            except Exception as e:
                logger.warning(f"Skipping {drv}: {e}")

        if not profiles:
            raise HTTPException(404, "No DNA profiles could be built")

        return {"session_key": key, "profiles": profiles}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Session DNA failed")
        raise HTTPException(500, str(e))


@router.get("/{year}/{round}/{session_type}/cluster/all")
async def get_cluster(
    year: int,
    round: int,
    session_type: str,
):
    try:
        session = load_session(year, round, session_type)
        key = f"{year}_{round}_{session_type}"
        all_drivers = get_drivers_in_session(session)

        profiles = []
        for d in all_drivers:
            try:
                dna = build_driver_dna(session, d["code"], key)
                profiles.append(dna)
            except Exception as e:
                logger.warning(f"Skipping {d['code']}: {e}")

        if not profiles:
            raise HTTPException(404, "No profiles built")

        X = np.array([[dim["value"] for dim in p["style_dimensions"]] for p in profiles])
        X_centered = X - X.mean(axis=0)
        cov = np.cov(X_centered.T)
        eigenvalues, eigenvectors = np.linalg.eigh(cov)
        idx = np.argsort(eigenvalues)[::-1]
        components = eigenvectors[:, idx[:2]]
        coords = X_centered @ components

        points = []
        for i, p in enumerate(profiles):
            points.append({
                "driver":           p["driver_code"],
                "full_name":        p["full_name"],
                "team":             p["team"],
                "team_color":       p["team_color"],
                "x":                float(coords[i, 0]),
                "y":                float(coords[i, 1]),
                "style_dimensions": p["style_dimensions"],
            })

        return {"session_key": key, "points": points}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Cluster failed")
        raise HTTPException(500, str(e))


@router.get("/{year}/{round}/{session_type}/delta/{driver_a}/{driver_b}")
async def get_lap_delta(
    year: int,
    round: int,
    session_type: str,
    driver_a: str,
    driver_b: str,
):
    """
    Return the cumulative time delta between two drivers across a lap.
    Positive = driver_a is ahead, negative = driver_b is ahead.
    """
    try:
        session = load_session(year, round, session_type)
        key = f"{year}_{round}_{session_type}"

        dna_a = build_driver_dna(session, driver_a.upper(), key)
        dna_b = build_driver_dna(session, driver_b.upper(), key)

        def get_speed(dna):
            ch = next((c for c in dna["channels"] if c["name"] == "Speed"), None)
            if not ch:
                return np.zeros(500)
            raw_range = ch["raw_max"] - ch["raw_min"]
            return np.array(ch["values"]) * raw_range + ch["raw_min"]

        speed_a = get_speed(dna_a)
        speed_b = get_speed(dna_b)
        distance = np.array(dna_a["distance_meters"])

        segment_dist = np.diff(distance)
        time_a = segment_dist / (speed_a[:-1] + 1e-6) * 3.6
        time_b = segment_dist / (speed_b[:-1] + 1e-6) * 3.6

        delta = np.cumsum(time_b - time_a)
        delta = delta - delta[0]

        return {
            "driver_a":    driver_a.upper(),
            "driver_b":    driver_b.upper(),
            "color_a":     dna_a["team_color"],
            "color_b":     dna_b["team_color"],
            "distance":    distance[1:].tolist(),
            "delta":       delta.tolist(),
            "final_delta": float(delta[-1]),
        }
    except Exception as e:
        logger.exception("Delta failed")
        raise HTTPException(500, str(e))