from fastapi import APIRouter, HTTPException
from app.services.session_loader import (
    get_event_schedule,
    load_session,
    get_drivers_in_session,
)

router = APIRouter()


@router.get("/schedule/{year}")
async def get_schedule(year: int):
    """Return all rounds for a given season."""
    if year < 2018 or year > 2025:
        raise HTTPException(400, "Year must be between 2018 and 2025")
    try:
        return get_event_schedule(year)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/{year}/{round}/{session_type}/drivers")
async def get_drivers(year: int, round: int, session_type: str):
    """Return all drivers in a specific session."""
    try:
        session = load_session(year, round, session_type)
        return get_drivers_in_session(session)
    except Exception as e:
        raise HTTPException(500, str(e))