"""
SQLite database для pipeline.
Единая промежуточная БД для всех этапов.
"""
import sqlite3
from pathlib import Path
from config.settings import PIPELINE_DB, PROCESSED_DIR

SCHEMA = """
-- Города
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL DEFAULT 'Россия',
    lat REAL,
    lng REAL,
    legacy_id INTEGER UNIQUE
);

-- Сети ресторанов
CREATE TABLE IF NOT EXISTS restaurant_chains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    legacy_id INTEGER UNIQUE
);

-- Рестораны (основная таблица)
CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    city TEXT,
    city_id INTEGER REFERENCES cities(id),
    address TEXT,
    metro_station TEXT,
    lat REAL,
    lng REAL,
    phone TEXT,
    email TEXT,
    website TEXT,
    description TEXT,
    cuisine TEXT,  -- JSON array
    price_range TEXT,
    average_bill INTEGER,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    opening_hours TEXT,
    features TEXT,  -- JSON array
    tags TEXT,  -- JSON array
    status TEXT DEFAULT 'active' CHECK (status IN ('active','closed','unknown')),
    -- Источники
    source TEXT NOT NULL,  -- 'osm', 'legacy', '2gis', 'google', 'merged'
    source_id TEXT,  -- ID во внешнем источнике
    source_ids TEXT,  -- JSON: {"osm": "123", "legacy": "456", ...}
    -- Данные legacy
    chain_id INTEGER REFERENCES restaurant_chains(id),
    legacy_id INTEGER,
    external_2gis_id TEXT,
    has_wifi INTEGER DEFAULT 0,
    has_delivery INTEGER DEFAULT 0,
    instagram TEXT,
    vk TEXT,
    facebook TEXT,
    youtube TEXT,
    district_id INTEGER REFERENCES districts(id),
    -- Мета
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    -- Дедупликация
    merged_into_id INTEGER REFERENCES restaurants(id),
    is_duplicate INTEGER DEFAULT 0
);

-- Кухни (справочник)
CREATE TABLE IF NOT EXISTS cuisines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    legacy_id INTEGER UNIQUE
);

-- Связь ресторан-кухня
CREATE TABLE IF NOT EXISTS restaurant_cuisines (
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    cuisine_id INTEGER NOT NULL REFERENCES cuisines(id),
    PRIMARY KEY (restaurant_id, cuisine_id)
);

-- Расписание
CREATE TABLE IF NOT EXISTS working_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TEXT,
    close_time TEXT,
    is_closed INTEGER DEFAULT 0,
    UNIQUE (restaurant_id, day_of_week)
);

-- Блюда (меню)
CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    category TEXT,
    name TEXT NOT NULL,
    description TEXT,
    composition TEXT,
    price REAL,
    weight TEXT,
    photo_url TEXT,
    calories INTEGER,
    protein REAL,
    fat REAL,
    carbs REAL,
    is_available INTEGER DEFAULT 1,
    is_healthy_choice INTEGER DEFAULT 0,
    source TEXT,
    legacy_id INTEGER
);

-- Фотографии
CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    url TEXT NOT NULL,
    local_path TEXT,
    type TEXT CHECK (type IN ('interior','exterior','dish','menu','atmosphere')),
    caption TEXT,
    source TEXT,
    width INTEGER,
    height INTEGER,
    is_primary INTEGER DEFAULT 0,
    legacy_id INTEGER
);

-- Отзывы
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    author TEXT,
    rating REAL,
    text TEXT,
    date TEXT,
    source TEXT,
    language TEXT DEFAULT 'ru',
    legacy_id INTEGER UNIQUE
);

-- Районы
CREATE TABLE IF NOT EXISTS districts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    city_id INTEGER REFERENCES cities(id)
);

-- Лог импорта
CREATE TABLE IF NOT EXISTS import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'started', 'completed', 'error'
    records_count INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    finished_at TEXT
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_restaurants_source ON restaurants(source);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_lat_lng ON restaurants(lat, lng);
CREATE INDEX IF NOT EXISTS idx_restaurants_legacy_id ON restaurants(legacy_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_source_id ON restaurants(source, source_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_duplicate ON restaurants(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_photos_restaurant ON photos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_district ON restaurants(district_id);
CREATE INDEX IF NOT EXISTS idx_districts_city ON districts(city_id);
"""

# ALTER TABLE statements for existing databases
MIGRATIONS = [
    ("restaurants", "district_id", "ALTER TABLE restaurants ADD COLUMN district_id INTEGER REFERENCES districts(id)"),
    ("dishes", "is_healthy_choice", "ALTER TABLE dishes ADD COLUMN is_healthy_choice INTEGER DEFAULT 0"),
]


def get_connection() -> sqlite3.Connection:
    """Получить соединение с pipeline БД."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(PIPELINE_DB), timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Инициализировать схему БД."""
    conn = get_connection()
    conn.executescript(SCHEMA)
    # Apply migrations for existing databases (add new columns if missing)
    for table, column, sql in MIGRATIONS:
        try:
            cols = [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
            if column not in cols:
                conn.execute(sql)
        except Exception:
            pass
    conn.commit()
    conn.close()
    print(f"[DB] Инициализирована: {PIPELINE_DB}")


def log_import(source: str, stage: str, status: str,
               records_count: int = 0, error_message: str = None):
    """Записать в лог импорта."""
    conn = get_connection()
    conn.execute(
        """INSERT INTO import_log (source, stage, status, records_count, error_message)
           VALUES (?, ?, ?, ?, ?)""",
        (source, stage, status, records_count, error_message)
    )
    conn.commit()
    conn.close()
