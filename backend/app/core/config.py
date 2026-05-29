from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "PitWall DNA"
    APP_VERSION: str = "1.0.0"

    # FastF1 stores downloaded session data here
    F1_CACHE_DIR: str = "f1_cache"

    # How many distance samples per lap signature
    SIGNATURE_RESOLUTION: int = 500

    # Minimum clean laps needed to build a driver DNA
    MIN_LAPS_FOR_DNA: int = 3

    # Laps slower than 107% of best lap are excluded
    OUTLIER_LAP_THRESHOLD: float = 1.07


settings = Settings()