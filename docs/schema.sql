-- =============================================================
-- Menu-Rest — Новая схема PostgreSQL
-- Версия: 1.0 / 2026-03-10
-- =============================================================

-- ─── ГЕО ──────────────────────────────────────────────────────

CREATE TABLE cities (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  slug       VARCHAR(150) UNIQUE NOT NULL,
  country    VARCHAR(100) NOT NULL DEFAULT 'Россия',
  legacy_id  INT UNIQUE                        -- rest_city.id
);

-- ─── СЕТИ ─────────────────────────────────────────────────────

CREATE TABLE restaurant_chains (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  slug       VARCHAR(200) UNIQUE NOT NULL,
  legacy_id  INT UNIQUE                        -- rest_rest.id WHERE main=1
);

-- ─── РЕСТОРАНЫ ────────────────────────────────────────────────

CREATE TABLE restaurants (
  id              SERIAL PRIMARY KEY,
  chain_id        INT REFERENCES restaurant_chains(id) ON DELETE SET NULL,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(200) UNIQUE NOT NULL,
  description     TEXT,
  city_id         INT NOT NULL REFERENCES cities(id),
  address         VARCHAR(300),
  metro_station   VARCHAR(100),
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  phone           VARCHAR(100),
  website         VARCHAR(300),
  price_level     SMALLINT CHECK (price_level BETWEEN 1 AND 4),
  average_bill    INT,                         -- в рублях
  has_wifi        BOOLEAN NOT NULL DEFAULT false,
  has_delivery    BOOLEAN NOT NULL DEFAULT false,
  -- Рейтинг (пересчитывается из reviews после импорта)
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count    INT NOT NULL DEFAULT 0,
  -- Статус публикации
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','archived','closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Аудит импорта
  legacy_id       INT UNIQUE,                  -- rest_rest.id
  external_2gis_id VARCHAR(255)                -- rest_rest.2gis_id
);

-- ─── КУХНИ ────────────────────────────────────────────────────

CREATE TABLE cuisines (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  legacy_id  INT UNIQUE                        -- rest_answer_items_kitchen.id
);

CREATE TABLE restaurant_cuisines (
  restaurant_id  INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  cuisine_id     INT NOT NULL REFERENCES cuisines(id) ON DELETE CASCADE,
  PRIMARY KEY (restaurant_id, cuisine_id)
);

-- ─── РАСПИСАНИЕ ───────────────────────────────────────────────
-- Нормализовано: вместо 14 колонок в rest_rest → 7 строк на ресторан

CREATE TABLE working_hours (
  id             SERIAL PRIMARY KEY,
  restaurant_id  INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week    SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
                                               -- 0=Пн 1=Вт 2=Ср 3=Чт 4=Пт 5=Сб 6=Вс
  open_time      TIME,
  close_time     TIME,
  is_closed      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (restaurant_id, day_of_week)
);

-- ─── МЕНЮ ─────────────────────────────────────────────────────

CREATE TABLE dishes (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(300) NOT NULL,
  description   TEXT,
  composition   TEXT,                          -- состав
  calories      INT,
  protein       DECIMAL(6,1),
  fat           DECIMAL(6,1),
  carbs         DECIMAL(6,1),
  weight_grams  INT,
  volume_ml     INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  legacy_id     INT UNIQUE                     -- rest_menu.id
);

CREATE TABLE restaurant_dishes (
  id             SERIAL PRIMARY KEY,
  restaurant_id  INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dish_id        INT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  category_name  VARCHAR(200),                 -- из rest_menu_section.value_ru
  price          INT NOT NULL CHECK (price >= 0),  -- в копейках
  is_available   BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, dish_id)
);

-- ─── ФОТОГРАФИИ ───────────────────────────────────────────────

CREATE TABLE photos (
  id             SERIAL PRIMARY KEY,
  restaurant_id  INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  url            VARCHAR(500) NOT NULL,
  source         VARCHAR(20) NOT NULL DEFAULT 'legacy'
                   CHECK (source IN ('internal','2gis','user','legacy')),
  sort_order     INT NOT NULL DEFAULT 0,
  is_cover       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  legacy_id      INT                           -- rest_rest_photo.id или 2gis id
);

-- ─── ОТЗЫВЫ ───────────────────────────────────────────────────

CREATE TABLE reviews (
  id                 SERIAL PRIMARY KEY,
  restaurant_id      INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  author_name        VARCHAR(100),
  rating_food        SMALLINT CHECK (rating_food BETWEEN 1 AND 5),
  rating_service     SMALLINT CHECK (rating_service BETWEEN 1 AND 5),
  rating_atmosphere  SMALLINT CHECK (rating_atmosphere BETWEEN 1 AND 5),
  rating_overall     SMALLINT CHECK (rating_overall BETWEEN 1 AND 5),
  text               TEXT,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','rejected')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  legacy_id          INT UNIQUE                -- rest_review.id
);

-- ─── ИНДЕКСЫ ──────────────────────────────────────────────────

CREATE INDEX idx_restaurants_city_id      ON restaurants(city_id);
CREATE INDEX idx_restaurants_chain_id     ON restaurants(chain_id);
CREATE INDEX idx_restaurants_status       ON restaurants(status);
CREATE INDEX idx_restaurants_rating       ON restaurants(rating DESC);
CREATE INDEX idx_restaurants_legacy_id    ON restaurants(legacy_id);

CREATE INDEX idx_restaurant_cuisines_r    ON restaurant_cuisines(restaurant_id);
CREATE INDEX idx_restaurant_cuisines_c    ON restaurant_cuisines(cuisine_id);

CREATE INDEX idx_restaurant_dishes_r      ON restaurant_dishes(restaurant_id);

CREATE INDEX idx_photos_restaurant_id     ON photos(restaurant_id);

CREATE INDEX idx_reviews_restaurant_id    ON reviews(restaurant_id);
CREATE INDEX idx_reviews_status           ON reviews(restaurant_id, status);

CREATE INDEX idx_working_hours_r          ON working_hours(restaurant_id);
