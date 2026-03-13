"""
Конфигурация pipeline.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Корневая директория pipeline
BASE_DIR = Path(__file__).resolve().parent.parent

# Пути к данным
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

# SQLite база pipeline (промежуточная)
PIPELINE_DB = PROCESSED_DIR / "pipeline.db"

# Legacy SQL файл
LEGACY_SQL_FILE = BASE_DIR.parent / "mr.sql"

# --- Overpass API (OSM) ---
OVERPASS_URLS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
OVERPASS_URL = OVERPASS_URLS[0]  # default: kumi (faster for big queries)
OVERPASS_TIMEOUT = 120  # секунд (2 минуты, при таймауте пробуем след. сервер)
OVERPASS_DELAY = 3.0  # пауза между запросами (секунд)

# --- Парсинг ---
REQUEST_DELAY_MIN = 1.0
REQUEST_DELAY_MAX = 3.0
MAX_RETRIES = 5
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

# --- Дедупликация ---
DEDUP_DISTANCE_METERS = 200
DEDUP_NAME_THRESHOLD = 0.85

# --- Города (приоритет) ---
PRIORITY_CITIES = [
    "Москва", "Санкт-Петербург",
]
MEDIUM_CITIES = [
    "Екатеринбург", "Новосибирск", "Казань",
    "Нижний Новгород", "Самара", "Сочи",
    "Краснодар", "Ростов-на-Дону",
]

# --- OSM теги для ресторанов ---
OSM_AMENITY_TAGS = ["restaurant", "cafe", "fast_food", "bar", "pub"]
