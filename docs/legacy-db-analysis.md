# Анализ legacy базы данных menu_rest (mr.sql)

**Версия:** 1.0
**Дата:** 2026-03-10
**Источник:** MariaDB 10.3 дамп, база `menu_rest`

---

## 1. Масштаб данных

| Таблица | Кол-во записей | Описание |
|---------|---------------|----------|
| `rest_rest` | ~60 600 | Рестораны |
| `rest_rest2kitchen` | ~6 500 000 | Связи ресторан ↔ кухня |
| `rest_rest_photo` | ~79 400 | Фотографии ресторанов (свои) |
| `rest_rest_photo_2gis` | ~95 700 | Фотографии из 2ГИС |
| `rest_menu` | ~18 400 | Блюда |
| `rest_menu_section` | ~1 000 | Категории меню |
| `rest_menu_photo` | ~1 860 | Фотографии блюд |
| `rest_table_order` | ~14 500 | Заказы на столах (POS) |
| `rest_table_order_row` | ~133 600 | Строки заказов (POS) |
| `rest_review` | ~470 | Отзывы |
| `user` | ~27 700 | Пользователи системы (все роли) |
| `app_users` | ~440 | Мобильные пользователи |
| `rest_city` | ~222 | Города |
| `ipgeobase_city` | ~152 600 | Геобаза городов |
| `rest_journal` | ~12 000 | Лог действий |
| `rest_answer_data` | ~5 200 | Ответы анкет ресторанов |

---

## 2. Основные сущности и связи

### 2.1. Ресторан (`rest_rest`) — центральная сущность

```
rest_rest
  ├── .city → rest_city.id
  ├── .2gis_id (внешний ID 2ГИС)
  ├── 7 языков описания (description_ru/en/es/it/zh/de/fr/ar)
  ├── 14 полей расписания (work_time_mon_begin/end × 7 дней)
  ├── 7 полей перерывов (break_mon..break_sun)
  ├── 3 рейтинга: ratingQuality, ratingService, ratingInterior
  ├── 6 накопительных счётчиков: sum_rating*, voted*
  └── .parent_id (иерархия — филиалы)
```

### 2.2. Граф связей

```
rest_rest
  ↕  rest_rest_photo           (фото ресторана, own)
  ↕  rest_rest_photo_2gis      (фото из 2ГИС)
  ↕  rest_rest2kitchen         (кухни: restId → rest_answer_items_kitchen.id)
  ↕  rest_rest2user            (владелец/менеджер: userId → user.id)
  ↕  rest_rest2gis             (зеркало данных 2ГИС, отдельная таблица)
  ↕  rest_rest_file            (прикреплённые файлы)
  ↕  rest_review               (отзывы по ресторану)
  ↕  rest_feedback             (короткие оценки, rate без текста)
  ↕  rest_poster               (афиши/мероприятия)
  ↕  rest_shares               (акции/скидки)
  ↕  rest_vip                  (VIP-персоны заведения)
  ↕  rest_answer               (анкеты онбординга)
  ↕  rest_table                (физические столы)
      ↕ rest_table_order       (заказы POS)
          ↕ rest_table_order_row (строки заказов POS)

rest_menu (блюда)
  ├── .rest_id → rest_rest.id
  ├── .section_id → rest_menu_section.id
  ├── 8 языков названия и описания (title_ru/en/es/it/zh/de/fr/ar)
  ├── КБЖУ: calories, proteins, carbohydrates, fats
  ├── .image LONGBLOB (!!бинарные данные прямо в БД)
  ↕  rest_menu_photo           (доп. фото блюда)
  ↕  rest_menu_review          (отзывы на блюдо)
  ↕  rest_menu_order           (входит в онлайн-заказы)
  ↕  rest_bl                   (бизнес-ланч: bl_id → rest_menu.id)

rest_bl (бизнес-ланчи)
  ├── .rest_id → rest_rest.id
  ├── .menu_id → rest_menu.id
  ↕  rest_bl2category          (категория БЛ)
  ↕  rest_bl2day               (дни недели БЛ)
  ↕  rest_bl2menu              (состав БЛ)
  ↕  rest_blorder              (порядок блюд в БЛ)

user (пользователи)
  ├── roles: administrator, manager, rest, user, waiter
  ↕  rest_rest2user            (привязка к ресторану)
  ↕  rest_answer               (прохождение анкет)
  ↕  rest_table_order          (официант)

rest_city
  ├── .area → rest_area.id
  └── .country_id → rest_country.id
```

---

## 3. Классификация таблиц

### ✅ CORE — обязательно переносим

| Legacy таблица | Новая таблица | Что берём |
|---------------|--------------|-----------|
| `rest_city` | `cities` | id, name, country_id |
| `rest_country` | (встроить в cities) | name → cities.country |
| `rest_area` | `districts` (опционально) | name |
| `rest_rest` | `restaurants` | name, city, address, lat/lon, avgBill, phone, email, www, description_ru, ratingQuality, ratingService, ratingInterior, socials, расписание (нормализовать!) |
| `rest_answer_items_kitchen` | `cuisines` | id, value (название кухни) |
| `rest_rest2kitchen` | `restaurant_cuisines` | restId → restaurant_id, kitchenId → cuisine_id |
| `rest_menu_section` | `menu_categories` | restId, value_ru (название), ordering |
| `rest_menu` | `dishes` | rest_id, section_id, title_ru, price, weight, calories, proteins, carbohydrates, fats |
| `rest_rest_photo` | `photos` | rest_id, filename, ordering |
| `rest_rest_photo_2gis` | `photos` (с пометкой source='2gis') | rest_id, url, description |
| `rest_review` | `reviews` | restId, userId, text, rate, ratingInterior, ratingQuality, ratingService, date, status |
| `user` (role='user') | `users` | username, email, avatar, firstname, lastname |

---

### 🔶 USEFUL BUT OPTIONAL — переносим если нужно

| Legacy таблица | Ценность | Что делать |
|---------------|---------|-----------|
| `rest_menu_photo` | Фото блюд | Перенести в `photos` с owner='dish' |
| `rest_bl` + `rest_bl2*` | Бизнес-ланчи | Перенести как особый тип меню / тег |
| `rest_poster` | Афиши/события | Будущий модуль Events |
| `rest_shares` | Акции | Будущий модуль Promotions |
| `rest_feedback` | 3 записи, почти пусто | Пропустить |
| `rest_rest_file` | Прикреплённые файлы (PDF меню) | Перенести если есть ссылки |
| `rest_menu_review` | Отзывы на блюда | Перенести если данных > 0 |
| `rest_order_table` / `rest_menu_order` | Онлайн-заказы | Перенести если нужен модуль заказов |
| `rest_vip` | 3 записи | Пропустить |
| `app_users` | Мобильные устройства | Не переносить — нет email/auth данных |

---

### ❌ LEGACY — удаляем / не переносим

| Таблица | Причина |
|---------|---------|
| `rest_rest2gis` | Зеркало данных 2ГИС — дубль `rest_rest`, не нужен |
| `rest_rest2gis2kitchen` | То же — 2ГИС дублирующая связь |
| `rest_rest2gis_photo` / `rest_rest2gis_photo_2gis` | Дублируют `rest_rest_photo_2gis` |
| `sync_rest` | Снэпшот для синхронизации с 2ГИС — не нужен |
| `rest_answer` / `rest_answer_data` / `rest_answer_items_*` | Онбординг-анкеты владельцев — нужны только для бэкофиса |
| `rest_question` / `rest_question_type` / `rest_questions_group` | Конфигуратор анкет — выбросить |
| `rest_journal` | Лог в старой системе — начать заново |
| `rest_table` / `rest_table_order` / `rest_table_order_row` | POS-система официантов — отдельный продукт, не агрегатор |
| `rest_user_` | Пустая/дублирующая таблица |
| `ipgeobase_city` / `ipgeobase_ip` / `ipgeobase_regcenter` | Геобаза IP → не нужна для агрегатора |
| `gallery` / `gallery_details` | CMS-галерея — не переносим |
| `section` / `section_details` / `section_links` / `section_related_product` | CMS-структура — не переносим |
| `menu_items` / `menu_items_details` / `menu_types` | CMS-меню навигации (не меню еды!) — удалить |
| `page_redirect` | CMS-редиректы — не переносим |
| `plugin_options` / `plugin_options_details` | CMS-плагины — удалить |
| `template_position` / `wysiwyg_editor` | CMS-вёрстка — удалить |
| `widget` / `widget_details` | CMS-виджеты — удалить |
| `seo_template` / `seo_template_details` | SEO шаблоны старой CMS — строим заново |
| `send_message` / `send_message_translate` | Email-рассылки — строим заново |
| `settings` | Конфиг старой CMS — не нужен |
| `language` | Языки старой CMS — не нужен |
| `user` (roles: administrator, manager, rest, waiter) | Перенести только role='user' |
| `user_details` / `user_role` / `user_transactions` | Старая RBAC система — строим заново |

---

## 4. Ключевые проблемы legacy архитектуры

### 4.1. Денормализация расписания
Вместо отдельной таблицы — 14 полей в `rest_rest`:
```sql
-- Legacy (плохо):
work_time_mon_begin, work_time_mon_end, work_time_tue_begin, ...
break_mon, break_tue, ...

-- Новая схема (нормально):
working_hours (restaurant_id, day_of_week, open_time, close_time, break_start, break_end)
```

### 4.2. Многоязычность через отдельные колонки
`description_ru`, `description_en`, `description_es`... 8 колонок в одной таблице.
→ В новой архитектуре используем отдельную таблицу переводов или JSON.

### 4.3. Бинарные данные в БД
`rest_menu.image LONGBLOB` — фотографии прямо в MariaDB.
→ В новой схеме: файлы в S3/MinIO, в БД только URL.

### 4.4. Рейтинг как денормализованные счётчики
`ratingQuality`, `sum_ratingQuality`, `votedQuality` — три поля на каждый критерий.
→ Рейтинг вычисляется динамически из таблицы `reviews`.

### 4.5. Кухня через промежуточную анкетную систему
`rest_rest2kitchen.kitchenId → rest_answer_items_kitchen.id`
Кухни хранятся внутри системы анкет (`rest_answer_items_kitchen`), а не как самостоятельный справочник.
→ Вынести в отдельную таблицу `cuisines`.

### 4.6. 2ГИС как параллельная таблица
`rest_rest2gis` — полная копия структуры `rest_rest` для данных из 2ГИС.
→ В новой схеме: один источник truth + поле `source` для маркировки происхождения.

---

## 5. Новая схема PostgreSQL

```sql
-- ═══════════════════════════════════════
-- ГЕО
-- ═══════════════════════════════════════

CREATE TABLE countries (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  code      CHAR(2)                        -- ISO 3166
);

CREATE TABLE cities (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  slug       VARCHAR(150) UNIQUE NOT NULL,
  country_id INT REFERENCES countries(id),
  lat        DECIMAL(9,6),
  lng        DECIMAL(9,6),
  -- Маппинг из legacy:
  legacy_id  INT UNIQUE                    -- rest_city.id
);

CREATE TABLE districts (
  id       SERIAL PRIMARY KEY,
  city_id  INT NOT NULL REFERENCES cities(id),
  name     VARCHAR(150) NOT NULL,
  slug     VARCHAR(150) NOT NULL,
  UNIQUE(city_id, slug)
);

-- ═══════════════════════════════════════
-- СПРАВОЧНИКИ
-- ═══════════════════════════════════════

CREATE TABLE cuisines (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  slug      VARCHAR(100) UNIQUE NOT NULL,
  icon      VARCHAR(10),                   -- emoji
  legacy_id INT UNIQUE                     -- rest_answer_items_kitchen.id
);

CREATE TABLE features (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  slug     VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,           -- atmosphere, service, occasion, dietary, amenity
  icon     VARCHAR(10)
);

-- ═══════════════════════════════════════
-- РЕСТОРАН
-- ═══════════════════════════════════════

CREATE TABLE restaurants (
  id                  SERIAL PRIMARY KEY,
  slug                VARCHAR(200) UNIQUE NOT NULL,
  name                VARCHAR(200) NOT NULL,
  city_id             INT NOT NULL REFERENCES cities(id),
  district_id         INT REFERENCES districts(id),
  address             VARCHAR(300),
  metro_station       VARCHAR(100),
  lat                 DECIMAL(9,6),
  lng                 DECIMAL(9,6),
  phone               VARCHAR(100),
  email               VARCHAR(200),
  website             VARCHAR(300),
  description         TEXT,               -- Основное описание (ru)
  slogan              VARCHAR(255),
  average_bill_min    INT,                -- в рублях
  average_bill_max    INT,
  price_level         SMALLINT CHECK (price_level BETWEEN 1 AND 4),
  table_count         INT,
  parking_count       INT,
  has_wifi            BOOLEAN DEFAULT false,
  has_delivery        BOOLEAN DEFAULT false,
  -- Соцсети
  instagram           VARCHAR(255),
  vk                  VARCHAR(255),
  facebook            VARCHAR(255),
  youtube             VARCHAR(255),
  -- Рейтинг (вычисляется из reviews)
  rating_food         DECIMAL(3,2) DEFAULT 0,
  rating_service      DECIMAL(3,2) DEFAULT 0,
  rating_atmosphere   DECIMAL(3,2) DEFAULT 0,
  rating_overall      DECIMAL(3,2) DEFAULT 0,
  review_count        INT DEFAULT 0,
  -- Публикация
  status              VARCHAR(20) DEFAULT 'draft'
                        CHECK (status IN ('draft','published','archived','closed')),
  is_verified         BOOLEAN DEFAULT false,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  -- Аудит импорта
  legacy_id           INT UNIQUE,          -- rest_rest.id
  import_source       VARCHAR(50)          -- 'legacy', '2gis', 'manual'
);

CREATE TABLE restaurant_cuisines (
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  cuisine_id    INT NOT NULL REFERENCES cuisines(id) ON DELETE CASCADE,
  PRIMARY KEY (restaurant_id, cuisine_id)
);

CREATE TABLE restaurant_features (
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  feature_id    INT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  PRIMARY KEY (restaurant_id, feature_id)
);

CREATE TABLE working_hours (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Пн
  open_time     TIME,
  close_time    TIME,
  break_start   TIME,
  break_end     TIME,
  is_closed     BOOLEAN DEFAULT false,
  UNIQUE(restaurant_id, day_of_week)
);

-- ═══════════════════════════════════════
-- ФОТОГРАФИИ
-- ═══════════════════════════════════════

CREATE TABLE photos (
  id            SERIAL PRIMARY KEY,
  owner_type    VARCHAR(20) NOT NULL CHECK (owner_type IN ('restaurant','dish')),
  owner_id      INT NOT NULL,
  url           VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  alt_text      VARCHAR(300),
  sort_order    INT DEFAULT 0,
  is_cover      BOOLEAN DEFAULT false,
  source        VARCHAR(20) DEFAULT 'owner'  -- owner, 2gis, user
                  CHECK (source IN ('owner','2gis','user','import')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Аудит
  legacy_id     INT                          -- rest_rest_photo.id или rest_menu_photo.id
);
CREATE INDEX idx_photos_owner ON photos(owner_type, owner_id);

-- ═══════════════════════════════════════
-- МЕНЮ
-- ═══════════════════════════════════════

CREATE TABLE menu_categories (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  legacy_id     INT                          -- rest_menu_section.id
);

CREATE TABLE allergens (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  slug     VARCHAR(50) UNIQUE NOT NULL,
  icon     VARCHAR(10),
  eu_code  VARCHAR(10)
);

CREATE TABLE dishes (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id   INT REFERENCES menu_categories(id) ON DELETE SET NULL,
  name          VARCHAR(300) NOT NULL,
  description   TEXT,
  composition   TEXT,                        -- состав
  price         INT NOT NULL,                -- в копейках
  weight_grams  INT,
  volume_ml     INT,
  -- КБЖУ
  calories      INT,
  protein       DECIMAL(6,1),
  fat           DECIMAL(6,1),
  carbs         DECIMAL(6,1),
  -- Статус
  is_available  BOOLEAN DEFAULT true,
  is_special    BOOLEAN DEFAULT false,       -- бизнес-ланч и пр.
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  legacy_id     INT                          -- rest_menu.id
);

CREATE TABLE dish_allergens (
  dish_id     INT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  allergen_id INT NOT NULL REFERENCES allergens(id),
  severity    VARCHAR(20) DEFAULT 'contains'
                CHECK (severity IN ('contains','may_contain','free')),
  PRIMARY KEY (dish_id, allergen_id)
);

-- ═══════════════════════════════════════
-- ПОЛЬЗОВАТЕЛИ
-- ═══════════════════════════════════════

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(200) UNIQUE NOT NULL,
  password_hash   VARCHAR(200),
  name            VARCHAR(100),
  avatar_url      VARCHAR(500),
  city_id         INT REFERENCES cities(id),
  loyalty_points  INT DEFAULT 0,
  loyalty_level   VARCHAR(20) DEFAULT 'bronze'
                    CHECK (loyalty_level IN ('bronze','silver','gold')),
  auth_provider   VARCHAR(20) DEFAULT 'email',
  auth_provider_id VARCHAR(200),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  legacy_id       INT UNIQUE               -- user.id (только role='user')
);

CREATE TABLE user_allergen_profile (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allergen_id INT NOT NULL REFERENCES allergens(id),
  PRIMARY KEY (user_id, allergen_id)
);

CREATE TABLE user_favorites (
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

-- ═══════════════════════════════════════
-- ОТЗЫВЫ
-- ═══════════════════════════════════════

CREATE TABLE reviews (
  id               SERIAL PRIMARY KEY,
  user_id          INT REFERENCES users(id) ON DELETE SET NULL,
  restaurant_id    INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  -- Имя для незарегистрированных (из legacy)
  author_name      VARCHAR(100),
  rating_food      SMALLINT CHECK (rating_food BETWEEN 1 AND 5),
  rating_service   SMALLINT CHECK (rating_service BETWEEN 1 AND 5),
  rating_atmosphere SMALLINT CHECK (rating_atmosphere BETWEEN 1 AND 5),
  rating_overall   SMALLINT CHECK (rating_overall BETWEEN 1 AND 5),
  text             TEXT,
  status           VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  reply_text       TEXT,                   -- ответ ресторана
  is_verified      BOOLEAN DEFAULT false,  -- подтверждён бронированием
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  legacy_id        INT UNIQUE              -- rest_review.id
);

-- ═══════════════════════════════════════
-- БРОНИРОВАНИЯ
-- ═══════════════════════════════════════

CREATE TABLE bookings (
  id               SERIAL PRIMARY KEY,
  user_id          INT REFERENCES users(id) ON DELETE SET NULL,
  restaurant_id    INT NOT NULL REFERENCES restaurants(id),
  booking_date     DATE NOT NULL,
  booking_time     TIME NOT NULL,
  guests           SMALLINT NOT NULL,
  contact_name     VARCHAR(100),
  contact_phone    VARCHAR(50),
  special_requests TEXT,
  status           VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  confirmed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- ИНДЕКСЫ
-- ═══════════════════════════════════════

CREATE INDEX idx_restaurants_city ON restaurants(city_id);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_rating ON restaurants(rating_overall DESC);
CREATE INDEX idx_restaurants_legacy ON restaurants(legacy_id);
CREATE INDEX idx_restaurants_geo ON restaurants(lat, lng);

CREATE INDEX idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX idx_dishes_category ON dishes(category_id);
CREATE INDEX idx_dishes_legacy ON dishes(legacy_id);

CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id, status);
CREATE INDEX idx_reviews_user ON reviews(user_id);

CREATE INDEX idx_bookings_restaurant ON bookings(restaurant_id, booking_date);
CREATE INDEX idx_bookings_user ON bookings(user_id);
```

---

## 6. Маппинг legacy → новая схема

### 6.1. Города

```sql
-- Источник: rest_city (222 записи)
INSERT INTO countries (name, code) VALUES ('Россия', 'RU'), ('Украина', 'UA'), ...;

INSERT INTO cities (name, slug, country_id, legacy_id)
SELECT
  name,
  slugify(name),
  (SELECT id FROM countries WHERE name = rc.country_name), -- через rest_country
  id
FROM rest_city rc;
```

### 6.2. Кухни

```sql
-- Источник: rest_answer_items_kitchen (~73 строки)
INSERT INTO cuisines (name, slug, legacy_id)
SELECT value, slugify(value), id
FROM rest_answer_items_kitchen;
```

### 6.3. Рестораны

```sql
-- Источник: rest_rest (~60 600 строк)
INSERT INTO restaurants (
  slug, name, city_id, address, metro_station,
  lat, lng, phone, email, website,
  description, slogan,
  average_bill_min, average_bill_max,
  has_wifi, has_delivery,
  instagram, vk, facebook, youtube,
  status, legacy_id, import_source
)
SELECT
  slugify(r.name),
  r.name,
  c.id,                                    -- через cities.legacy_id = r.city
  r.address,
  r.closestMetro,
  r.lat, r.lon,
  r.phone,
  r.email,
  r.www,
  r.description_ru,
  r.slogan,
  CASE WHEN r.avgBill > 0 THEN ROUND(r.avgBill * 0.7) ELSE NULL END,
  CASE WHEN r.avgBill > 0 THEN ROUND(r.avgBill * 1.3) ELSE NULL END,
  CASE WHEN r.hasWifi NOT IN ('', '0', 'no', NULL) THEN true ELSE false END,
  CASE WHEN r.delivery = 1 THEN true ELSE false END,
  r.instagram, r.vk, r.facebook, r.youtube,
  'published',
  r.id,
  'legacy'
FROM rest_rest r
JOIN cities c ON c.legacy_id = r.city
WHERE r.main = 1 OR r.parent_id IS NULL;  -- берём только основные записи
```

### 6.4. Расписание (денормализация → нормализация)

```sql
-- Источник: rest_rest.work_time_mon_begin/end ... (14 полей)
-- Преобразуем 14 полей → 7 строк

INSERT INTO working_hours (restaurant_id, day_of_week, open_time, close_time)
SELECT r_new.id, 0, r.work_time_mon_begin::time, r.work_time_mon_end::time
FROM rest_rest r JOIN restaurants r_new ON r_new.legacy_id = r.id
WHERE r.work_time_mon_begin IS NOT NULL AND r.work_time_mon_begin != ''
UNION ALL
SELECT r_new.id, 1, r.work_time_tue_begin::time, r.work_time_tue_end::time ...
-- × 7 дней
```

### 6.5. Кухни ресторанов

```sql
-- Источник: rest_rest2kitchen (~6.5M, но реальных уникальных пар: ~500K)
INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id)
SELECT DISTINCT r_new.id, c_new.id
FROM rest_rest2kitchen rk
JOIN restaurants r_new ON r_new.legacy_id = rk.restId
JOIN cuisines c_new ON c_new.legacy_id = rk.kitchenId;
```

### 6.6. Блюда

```sql
-- Источник: rest_menu (~18 400 строк)
INSERT INTO dishes (
  restaurant_id, category_id, name, description, composition,
  price, weight_grams, volume_ml,
  calories, protein, fat, carbs,
  is_available, sort_order, legacy_id
)
SELECT
  r_new.id,
  mc_new.id,                               -- через menu_categories.legacy_id
  m.title_ru,
  m.description_ru,
  m.composition,
  ROUND(m.price * 100)::int,               -- рубли → копейки
  CASE WHEN m.weight ~ '^\d+$' THEN m.weight::int ELSE NULL END,
  ROUND(m.volume * 1000)::int,             -- литры → мл
  m.calories,
  m.proteins,
  m.fats,
  m.carbohydrates,
  CASE WHEN m.status = 1 THEN true ELSE false END,
  0,
  m.id
FROM rest_menu m
JOIN restaurants r_new ON r_new.legacy_id = m.rest_id
LEFT JOIN menu_categories mc_new ON mc_new.legacy_id = m.section_id
WHERE m.title_ru IS NOT NULL AND m.title_ru != '';
```

### 6.7. Фотографии ресторанов

```sql
-- Источник 1: rest_rest_photo (собственные фото, filename = имя файла)
INSERT INTO photos (owner_type, owner_id, url, sort_order, source, legacy_id)
SELECT 'restaurant', r_new.id,
  '/legacy-photos/' || p.filename,        -- или S3 URL после переноса файлов
  p.ordering, 'import', p.id
FROM rest_rest_photo p
JOIN restaurants r_new ON r_new.legacy_id = p.rest_id
WHERE p.nofile = 0 OR p.nofile IS NULL;

-- Источник 2: rest_rest_photo_2gis (URL уже есть)
INSERT INTO photos (owner_type, owner_id, url, alt_text, sort_order, source)
SELECT 'restaurant', r_new.id, p.url, p.description, p.2gis_photo_nr, '2gis'
FROM rest_rest_photo_2gis p
JOIN restaurants r_new ON r_new.legacy_id = p.rest_id;
```

### 6.8. Отзывы

```sql
-- Источник: rest_review (~470 строк)
INSERT INTO reviews (
  user_id, restaurant_id, author_name,
  rating_food, rating_service, rating_atmosphere, rating_overall,
  text, status, created_at, legacy_id
)
SELECT
  u_new.id,                                -- NULL если пользователь не найден
  r_new.id,
  COALESCE(rv.firstname || ' ' || rv.lastname, 'Гость'),
  rv.ratingQuality,
  rv.ratingService,
  rv.ratingInterior,
  rv.rate,
  rv.text,
  CASE WHEN rv.status = 1 THEN 'approved' ELSE 'pending' END,
  rv.date,
  rv.id
FROM rest_review rv
JOIN restaurants r_new ON r_new.legacy_id = rv.restId
LEFT JOIN users u_new ON u_new.legacy_id = rv.userId;
```

---

## 7. Что не переносится и почему

| Причина отказа | Таблицы |
|---------------|---------|
| **POS-система** — это другой продукт, не агрегатор | `rest_table`, `rest_table_order`, `rest_table_order_row` |
| **2ГИС-зеркала** — дублируют данные `rest_rest` | `rest_rest2gis`, `rest_rest2gis2kitchen`, `rest_rest2gis_photo*`, `sync_rest` |
| **Онбординг-анкеты** — внутренний процесс, не публичные данные | `rest_answer`, `rest_answer_data`, `rest_question*` |
| **CMS старого сайта** — полностью заменяем | `section*`, `menu_items*`, `gallery*`, `widget*`, `template_position`, `wysiwyg_editor`, `seo_template*`, `settings`, `language`, `page_redirect` |
| **Мало данных** — не стоит усилий | `rest_feedback` (3 записи), `rest_vip` (3 записи) |
| **Нет auth-данных** — только device_id | `app_users` |
| **Геобаза IP** — не используется в агрегаторе | `ipgeobase_*` |

---

## 8. Порядок миграции

```
Шаг 1. Подготовка
  1.1 Поднять MySQL-контейнер, загрузить mr.sql
  1.2 Создать новую PostgreSQL БД, запустить миграции

Шаг 2. Справочники (без зависимостей)
  2.1 countries ← rest_country
  2.2 cities    ← rest_city
  2.3 cuisines  ← rest_answer_items_kitchen
  2.4 features  ← (вручную заполнить справочник)
  2.5 allergens ← (вручную, по EU стандарту)

Шаг 3. Рестораны
  3.1 restaurants ← rest_rest (только main=1 или parent_id IS NULL)
  3.2 restaurant_cuisines ← rest_rest2kitchen
  3.3 working_hours ← rest_rest (7 × вставок на ресторан)

Шаг 4. Меню
  4.1 menu_categories ← rest_menu_section
  4.2 dishes ← rest_menu
  4.3 dish photos ← rest_menu_photo (URL → S3)

Шаг 5. Медиа
  5.1 photos (restaurant) ← rest_rest_photo (файлы → S3)
  5.2 photos (restaurant, source=2gis) ← rest_rest_photo_2gis

Шаг 6. Пользователи и отзывы
  6.1 users ← user WHERE role='user'
  6.2 reviews ← rest_review

Шаг 7. Верификация
  7.1 Проверить количество записей (ожидаемые цифры см. раздел 1)
  7.2 Проверить NULL в обязательных полях
  7.3 Проверить целостность FK
  7.4 Выборочно сравнить 10 ресторанов legacy vs new
```

---

## 9. Как проверить этот документ

1. **Структура таблиц** — сверьте с `mr.sql`: найдите `CREATE TABLE rest_rest` (строка ~1396) и сравните колонки с разделом 2.1
2. **Объём данных** — сверьте `AUTO_INCREMENT` значения в `mr.sql` с таблицей раздела 1
3. **Классификация** — откройте любую таблицу из категории "LEGACY" и проверьте, действительно ли она не нужна агрегатору
4. **SQL схема** — запустите раздел 5 в PostgreSQL, убедитесь что создаётся без ошибок
5. **SQL маппинг** — раздел 6 можно проверить запустив `SELECT ... LIMIT 5` на MySQL с реальными данными
