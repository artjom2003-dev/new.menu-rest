# Новая схема БД Menu-Rest — Проектирование

**Версия:** 1.0
**Дата:** 2026-03-10

---

## 1. Анализ parent_id в rest_rest

### Что есть в legacy

В `rest_rest` два поля:
```
parent_id  int(11) DEFAULT NULL
main       int(11) DEFAULT 0
```

### Вывод: это сети (chains), не дубли

| Признак | Значение |
|---------|---------|
| `main = 1, parent_id = NULL` | Головная запись сети (Макдональдс-Россия) |
| `main = 0, parent_id = X` | Конкретная точка сети (Макдональдс на Тверской) |
| `main = 0, parent_id = NULL` | Одиночный ресторан без сети |

**Почему уверен:**
- `rest_table` содержит 12 столов привязанных к `rest_id = 60325` — это конкретная точка, не сеть
- `rest_rest2kitchen` имеет 6.5M записей на 60K ресторанов — кухни привязываются к конкретным точкам
- `rest_rest2gis` (зеркало из 2ГИС) не имеет `parent_id` — 2ГИС отдаёт конкретные точки

**Что делать в новой схеме:**
- Одиночный ресторан: создаём 1 запись `restaurants` + 1 запись `restaurant_locations`
- Сеть (parent_id != NULL): создаём 1 запись `restaurant_chains` + N записей `restaurants` (по одной на точку)
- Головные записи (main=1) сами по себе не адрес — это юридическое лицо или бренд

---

## 2. Поля rest_rest — что берём, что отбрасываем

### 2.1. Берём

| Legacy поле | Новая таблица | Новое поле | Преобразование |
|------------|--------------|-----------|---------------|
| `id` | restaurants | `legacy_id` | Для аудита |
| `name` | restaurants | `name` | Как есть |
| `city` | restaurants | `city_id` | FK через cities.legacy_id |
| `address` | restaurant_locations | `address` | Как есть |
| `closestMetro` | restaurant_locations | `metro_station` | Как есть |
| `lat`, `lon` | restaurant_locations | `lat`, `lng` | Как есть |
| `phone` | restaurant_locations | `phone` | Основной телефон |
| `cellular` | restaurant_locations | `phone_alt` | Доп. телефон |
| `email` | restaurants | `email` | Как есть |
| `www` | restaurants | `website` | Как есть |
| `description_ru` | restaurants | `description` | Только RU |
| `slogan` | restaurants | `slogan` | Как есть |
| `avgBill` | restaurants | `average_bill` | Как есть (рубли) |
| `tableCount` | restaurants | `table_count` | Как есть |
| `parkingPlaceCount` | restaurants | `parking_count` | Как есть |
| `hasWifi` | restaurants | `has_wifi` | varchar → boolean |
| `delivery` | restaurants | `has_delivery` | int → boolean |
| `instagram` | restaurants | `instagram` | Как есть |
| `vk` | restaurants | `vk` | Как есть |
| `facebook` | restaurants | `facebook` | Как есть |
| `youtube` | restaurants | `youtube` | Как есть |
| `ratingQuality` | restaurants | `rating_food` | Пересчитать из reviews |
| `ratingService` | restaurants | `rating_service` | Пересчитать из reviews |
| `ratingInterior` | restaurants | `rating_atmosphere` | Пересчитать из reviews |
| `work_time_*_begin/end` (×7) | working_hours | 7 строк | Нормализовать |
| `parent_id` | restaurant_chains | Связь с брендом | Только если parent_id != NULL |
| `2gis_id` | restaurants | `external_id_2gis` | Для синхронизации |

### 2.2. Отбрасываем

| Legacy поле | Причина |
|------------|---------|
| `description_en/es/it/zh/de/fr/ar` | Не переводим, начинаем только с RU |
| `name_ext` | Дополнение к имени — невостребовано |
| `openingHours` | int-флаг непонятной семантики |
| `openingDate` | varchar(16) с нечитаемыми значениями |
| `entertainment` | Свободный текст без структуры |
| `comments` | Внутренние заметки редакторов |
| `fieldOfActivity` | varchar(1024) без структуры |
| `paymentOptions` | text без структуры, заменим на features |
| `hasWifi` + `passwordWifi` | Wifi-пароль не нужен на агрегаторе |
| `forChildren` | text → заменим на features ('детская комната') |
| `sum_ratingInterior/Service/Quality` | Денормализованные счётчики |
| `votedInterior/Service/Quality` | Денормализованные счётчики |
| `ratingQuality/Service/Interior` | Пересчитаем из таблицы reviews |
| `break_mon..break_sun` | Плохое качество данных, можно не переносить |
| `work_time` | Дублирует work_time_*_begin/end |
| `video`, `youtube_url`, `menuPdf` | Формат не актуален для агрегатора |
| `ping`, `speed_dowload`, `speed_upload` | WiFi-скорость — бессмысленное поле |
| `restoran_ru`, `restoclub_ru`, `afisha_ru`, `gis_ru` | Ссылки на конкурентов |
| `favourite` | int-флаг — не понятно что означает |
| `base_language` | Не нужен, будет только RU |
| `odnoklassniki` | Не актуальная соцсеть |
| `twitter` | Не актуальная соцсеть |
| `visit_count` | Считаем заново |
| `main` | Служебный флаг legacy — в новой схеме есть chains |

---

## 3. Новая схема PostgreSQL

### 3.1. Принципы

- **Нет денормализованных счётчиков** — рейтинг вычисляется из `reviews`
- **Нет многоязычных колонок** — начинаем только с RU, при необходимости добавим таблицу переводов
- **Нет бинарных данных в БД** — фото = URL в S3
- **Расписание нормализовано** — 7 строк вместо 14 колонок
- **Один источник truth для ресторана** — `restaurants` + `restaurant_locations` (адрес отдельно, т.к. сеть может иметь N адресов)

---

### 3.2. Диаграмма зависимостей

```
countries
  └── cities (country_id)
        └── districts (city_id)
              └── restaurant_locations (district_id, city_id)

restaurant_chains
  └── restaurants (chain_id)
        ├── restaurant_locations (restaurant_id)
        ├── restaurant_cuisines (restaurant_id) ──→ cuisines
        ├── restaurant_features (restaurant_id) ──→ features
        ├── working_hours (restaurant_id)
        ├── photos (owner_type='restaurant', owner_id)
        ├── menu_categories (restaurant_id)
        │     └── dishes (category_id)
        │           ├── photos (owner_type='dish', owner_id)
        │           └── dish_allergens ──→ allergens
        ├── reviews (restaurant_id) ──→ users
        └── bookings (restaurant_id) ──→ users

users
  ├── user_allergen_profile ──→ allergens
  ├── user_favorites ──→ restaurants
  └── bookings (user_id)
```

---

### 3.3. Таблицы — полные определения

#### countries
```
id         SERIAL PK
name       VARCHAR(100) NOT NULL
code       CHAR(2)                  -- ISO 3166-1 (RU, UA, BY...)
```

#### cities
```
id          SERIAL PK
country_id  INT → countries.id
name        VARCHAR(150) NOT NULL
slug        VARCHAR(150) UNIQUE NOT NULL
lat         DECIMAL(9,6)            -- центр города для геопоиска
lng         DECIMAL(9,6)
legacy_id   INT UNIQUE              -- rest_city.id (для маппинга при импорте)
```

#### areas
```
id       SERIAL PK
city_id  INT → cities.id
name     VARCHAR(150) NOT NULL      -- Центральный, Северный...
slug     VARCHAR(150) NOT NULL
UNIQUE(city_id, slug)
```
> `areas` — это округа / районы города. В legacy это `rest_area` (71 запись).
> Не путать с `district` — метро-район. Используем для SEO-страниц.

#### cuisines
```
id         SERIAL PK
name       VARCHAR(100) NOT NULL
slug       VARCHAR(100) UNIQUE NOT NULL
icon       VARCHAR(10)              -- emoji: 🍕 🍣 🥩
legacy_id  INT UNIQUE               -- rest_answer_items_kitchen.id
```

#### features
```
id        SERIAL PK
name      VARCHAR(100) NOT NULL
slug      VARCHAR(100) UNIQUE NOT NULL
category  VARCHAR(50) NOT NULL
          -- 'atmosphere'  → уютный, шумный, с видом, крышная терраса
          -- 'occasion'    → свидание, день рождения, деловой обед
          -- 'service'     → доставка, вынос, бронь
          -- 'dietary'     → веган, халяль, детское меню, глютен-фри
          -- 'amenity'     → парковка, wifi, живая музыка, танцпол
icon      VARCHAR(10)
```

#### restaurant_chains
```
id          SERIAL PK
name        VARCHAR(200) NOT NULL    -- Макдональдс, KFC, Шоколадница
slug        VARCHAR(200) UNIQUE NOT NULL
logo_url    VARCHAR(500)
website     VARCHAR(300)
legacy_id   INT UNIQUE               -- rest_rest.id WHERE main=1
```
> Заполняется только если ресторан — сеть (parent_id != NULL в legacy).
> ~10-20% ресторанов в базе.

#### restaurants
```
id               SERIAL PK
chain_id         INT → restaurant_chains.id  (NULL если не сеть)
name             VARCHAR(200) NOT NULL
slug             VARCHAR(200) UNIQUE NOT NULL
description      TEXT
slogan           VARCHAR(255)
average_bill     INT                -- руб., из avgBill
price_level      SMALLINT 1-4       -- вычислим из avgBill при импорте
table_count      INT
parking_count    INT
has_wifi         BOOLEAN DEFAULT false
has_delivery     BOOLEAN DEFAULT false
email            VARCHAR(200)
website          VARCHAR(300)
instagram        VARCHAR(255)
vk               VARCHAR(255)
facebook         VARCHAR(255)
youtube          VARCHAR(255)
-- Агрегированный рейтинг (обновляется триггером/job'ом)
rating_food        DECIMAL(3,2) DEFAULT 0
rating_service     DECIMAL(3,2) DEFAULT 0
rating_atmosphere  DECIMAL(3,2) DEFAULT 0
rating_overall     DECIMAL(3,2) DEFAULT 0
review_count       INT DEFAULT 0
-- Статус
status           VARCHAR(20) DEFAULT 'draft'
                   -- draft | published | archived | closed
is_verified      BOOLEAN DEFAULT false
published_at     TIMESTAMPTZ
created_at       TIMESTAMPTZ DEFAULT NOW()
updated_at       TIMESTAMPTZ DEFAULT NOW()
-- Аудит
legacy_id        INT UNIQUE          -- rest_rest.id
external_id_2gis VARCHAR(255)        -- rest_rest.2gis_id
import_source    VARCHAR(20)         -- 'legacy' | '2gis' | 'manual'
```

#### restaurant_locations
```
id             SERIAL PK
restaurant_id  INT → restaurants.id ON DELETE CASCADE
city_id        INT → cities.id
area_id        INT → areas.id      (NULL если не определён)
address        VARCHAR(300)
metro_station  VARCHAR(100)
lat            DECIMAL(9,6)
lng            DECIMAL(9,6)
phone          VARCHAR(100)
phone_alt      VARCHAR(100)
is_primary     BOOLEAN DEFAULT true
```

#### restaurant_cuisines
```
restaurant_id  INT → restaurants.id  PK part
cuisine_id     INT → cuisines.id     PK part
PRIMARY KEY (restaurant_id, cuisine_id)
```

#### restaurant_features
```
restaurant_id  INT → restaurants.id  PK part
feature_id     INT → features.id     PK part
PRIMARY KEY (restaurant_id, feature_id)
```

#### working_hours
```
id             SERIAL PK
restaurant_id  INT → restaurants.id ON DELETE CASCADE
day_of_week    SMALLINT 0-6         -- 0=Пн, 6=Вс
open_time      TIME
close_time     TIME
is_closed      BOOLEAN DEFAULT false
UNIQUE(restaurant_id, day_of_week)
```

#### photos
```
id            SERIAL PK
owner_type    VARCHAR(20)           -- 'restaurant' | 'dish'
owner_id      INT
url           VARCHAR(500) NOT NULL
thumbnail_url VARCHAR(500)
alt_text      VARCHAR(300)
sort_order    INT DEFAULT 0
is_cover      BOOLEAN DEFAULT false
source        VARCHAR(20)           -- 'owner' | '2gis' | 'user' | 'import'
created_at    TIMESTAMPTZ DEFAULT NOW()
legacy_id     INT                   -- rest_rest_photo.id или rest_menu_photo.id
```
> Единая таблица для фото ресторанов и блюд. Разделение через `owner_type`.

#### menu_categories
```
id             SERIAL PK
restaurant_id  INT → restaurants.id ON DELETE CASCADE
name           VARCHAR(200) NOT NULL   -- из rest_menu_section.value_ru
sort_order     INT DEFAULT 0
is_active      BOOLEAN DEFAULT true
legacy_id      INT                     -- rest_menu_section.id
```

#### allergens
```
id       SERIAL PK
name     VARCHAR(100) NOT NULL        -- Глютен, Молоко, Арахис...
slug     VARCHAR(50) UNIQUE NOT NULL
icon     VARCHAR(10)                  -- 🌾 🥛 🥜
eu_code  VARCHAR(10)                  -- EU Regulation 1169/2011
```

#### dishes
```
id             SERIAL PK
restaurant_id  INT → restaurants.id ON DELETE CASCADE
category_id    INT → menu_categories.id ON DELETE SET NULL
name           VARCHAR(300) NOT NULL    -- из rest_menu.title_ru
description    TEXT                    -- из rest_menu.description_ru
composition    TEXT                    -- из rest_menu.composition
price          INT NOT NULL            -- копейки (price*100)
weight_grams   INT                     -- из rest_menu.weight
volume_ml      INT                     -- из rest_menu.volume * 1000
calories       INT
protein        DECIMAL(6,1)            -- из rest_menu.proteins
fat            DECIMAL(6,1)            -- из rest_menu.fats
carbs          DECIMAL(6,1)            -- из rest_menu.carbohydrates
is_available   BOOLEAN DEFAULT true
sort_order     INT DEFAULT 0
created_at     TIMESTAMPTZ DEFAULT NOW()
updated_at     TIMESTAMPTZ DEFAULT NOW()
legacy_id      INT                     -- rest_menu.id
```

#### dish_allergens
```
dish_id     INT → dishes.id     PK part
allergen_id INT → allergens.id  PK part
severity    VARCHAR(20)          -- 'contains' | 'may_contain' | 'free'
PRIMARY KEY (dish_id, allergen_id)
```

#### users
```
id                SERIAL PK
email             VARCHAR(200) UNIQUE NOT NULL
password_hash     VARCHAR(200)
name              VARCHAR(100)
avatar_url        VARCHAR(500)
city_id           INT → cities.id
loyalty_points    INT DEFAULT 0
loyalty_level     VARCHAR(20) DEFAULT 'bronze'  -- bronze | silver | gold
auth_provider     VARCHAR(20) DEFAULT 'email'   -- email | vk | telegram
auth_provider_id  VARCHAR(200)
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMPTZ DEFAULT NOW()
legacy_id         INT UNIQUE                    -- user.id WHERE role='user'
```

#### user_allergen_profile
```
user_id     INT → users.id    PK part
allergen_id INT → allergens.id PK part
PRIMARY KEY (user_id, allergen_id)
```

#### user_favorites
```
user_id       INT → users.id       PK part
restaurant_id INT → restaurants.id PK part
created_at    TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (user_id, restaurant_id)
```

#### reviews
```
id                 SERIAL PK
restaurant_id      INT → restaurants.id ON DELETE CASCADE
user_id            INT → users.id ON DELETE SET NULL
author_name        VARCHAR(100)       -- для анонимных из legacy
rating_food        SMALLINT 1-5
rating_service     SMALLINT 1-5
rating_atmosphere  SMALLINT 1-5
rating_overall     SMALLINT 1-5      -- из legacy rest_review.rate
text               TEXT
reply_text         TEXT               -- ответ ресторана
status             VARCHAR(20) DEFAULT 'pending'
                     -- pending | approved | rejected
is_verified        BOOLEAN DEFAULT false
created_at         TIMESTAMPTZ DEFAULT NOW()
legacy_id          INT UNIQUE         -- rest_review.id
```

#### bookings
```
id               SERIAL PK
restaurant_id    INT → restaurants.id
user_id          INT → users.id ON DELETE SET NULL
contact_name     VARCHAR(100)
contact_phone    VARCHAR(50)
booking_date     DATE NOT NULL
booking_time     TIME NOT NULL
guests           SMALLINT NOT NULL
special_requests TEXT
status           VARCHAR(20) DEFAULT 'pending'
                   -- pending | confirmed | cancelled | completed | no_show
confirmed_at     TIMESTAMPTZ
created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### 3.4. Индексы

```
-- Рестораны
idx_restaurants_city        ON restaurants(city_id)
idx_restaurants_status      ON restaurants(status)
idx_restaurants_slug        ON restaurants(slug)        -- покрывает большинство запросов
idx_restaurants_rating      ON restaurants(rating_overall DESC)
idx_restaurants_bill        ON restaurants(average_bill)
idx_restaurants_legacy      ON restaurants(legacy_id)

-- Гео
idx_locations_restaurant    ON restaurant_locations(restaurant_id)
idx_locations_geo           ON restaurant_locations(lat, lng)

-- Меню
idx_dishes_restaurant       ON dishes(restaurant_id)
idx_dishes_category         ON dishes(category_id)
idx_dishes_price            ON dishes(price)
idx_dishes_legacy           ON dishes(legacy_id)

-- Фото
idx_photos_owner            ON photos(owner_type, owner_id)

-- Отзывы
idx_reviews_restaurant      ON reviews(restaurant_id, status)
idx_reviews_user            ON reviews(user_id)

-- Бронирования
idx_bookings_restaurant     ON bookings(restaurant_id, booking_date)
idx_bookings_user           ON bookings(user_id)
```

---

## 4. Что НЕ входит в v1 схемы (запланировано на потом)

| Функция | Почему отложили |
|---------|----------------|
| Бизнес-ланчи | Сложный маппинг rest_bl, данных немного, не критично для запуска |
| Акции/офферы | rest_shares, rest_poster — нет данных для автоматического переноса |
| Переводы (i18n) | Отдельная таблица translations — добавим когда будет EN версия |
| Аллергены блюд | Данных нет в legacy, заполняем вручную после запуска |
| Лояльность | Новая логика, не из legacy |
| Блог/статьи | Нет в legacy вообще |

---

## 5. План миграции данных

### Фаза 0 — Подготовка инфраструктуры
```
0.1  Развернуть MySQL-контейнер, загрузить mr.sql
     → проверить: SELECT COUNT(*) FROM rest_rest; — ожидаем ~60 600

0.2  Развернуть PostgreSQL 16, запустить миграции новой схемы
     → проверить: все таблицы созданы, constraints валидны

0.3  Создать .env с двумя подключениями:
     LEGACY_DB_* (MySQL 8 / MariaDB compatible)
     DB_* (PostgreSQL 16)

0.4  Написать helper slugify() для транслитерации RU → latin
     → проверить: slugify("Макдональдс") = "makdonalds"
```

### Фаза 1 — Справочники (без зависимостей)
```
1.1  Миграция: rest_country → countries
     Источник: ~1-2 страны
     Проверка: SELECT COUNT(*) FROM countries; ≥ 1

1.2  Миграция: rest_city → cities
     Источник: 222 записи
     Зависит от: countries (country_id через rest_country)
     Проверка: SELECT COUNT(*) FROM cities; = 222
               Случайная выборка: 5 городов сравнить name

1.3  Миграция: rest_area → areas
     Источник: ~71 запись
     Зависит от: cities
     Проверка: SELECT COUNT(*) FROM areas; ~71

1.4  Миграция: rest_answer_items_kitchen → cuisines
     Источник: ~73 записи
     Проверка: SELECT COUNT(*) FROM cuisines; ~73
               Проверить slug уникальность

1.5  Ручное заполнение: features (справочник)
     ~30-40 значений из ТЗ: атмосфера, повод, сервис, диета, удобства
     Проверка: SELECT COUNT(*) FROM features; ≥ 30

1.6  Ручное заполнение: allergens (14 EU аллергенов)
     Проверка: SELECT COUNT(*) FROM allergens; = 14
```

### Фаза 2 — Сети ресторанов (опционально, делаем после основных)
```
2.1  Определить сети: SELECT id, name FROM rest_rest WHERE main=1
     → оценить количество

2.2  Миграция: rest_rest (main=1) → restaurant_chains
     Проверка: COUNT совпадает с 2.1
```

### Фаза 3 — Рестораны (ядро)
```
3.1  Миграция: rest_rest → restaurants
     Фильтр: main != 1 (не головные записи сетей)
             ИЛИ (main = 1 AND parent_id IS NULL) — одиночные
     Зависит от: cities, restaurant_chains
     Преобразования:
       - slugify(name) с проверкой уникальности
       - hasWifi: varchar → boolean (≠ '0', '', 'no', NULL → true)
       - delivery: int → boolean
       - price_level: вычислить из avgBill
         (NULL→NULL, ≤500→1, ≤1500→2, ≤3000→3, >3000→4)
     Проверка: COUNT(restaurants) ≈ 50 000-58 000 (минус сети)
               10 случайных записей — сверить с legacy

3.2  Миграция: расписание → working_hours
     Источник: 14 колонок rest_rest → 7 строк на ресторан
     Пропускаем если work_time_*_begin = NULL или ''
     Проверка: SELECT restaurant_id, COUNT(*) FROM working_hours
               GROUP BY 1 HAVING COUNT(*) > 7; → должно быть 0

3.3  Миграция: restaurant_locations
     Источник: rest_rest (address, closestMetro, lat, lon, phone, cellular)
     1 запись на каждый ресторан (is_primary = true)
     Проверка: COUNT(restaurant_locations) = COUNT(restaurants)
```

### Фаза 4 — Связи ресторана
```
4.1  Миграция: rest_rest2kitchen → restaurant_cuisines
     Источник: ~6.5M строк, но через DISTINCT ~500K уникальных пар
     Зависит от: restaurants, cuisines
     Важно: брать только DISTINCT (restId, kitchenId)
     Проверка: COUNT(restaurant_cuisines) vs ожидание
               Ресторан без кухни: SELECT COUNT(*) FROM restaurants r
               LEFT JOIN restaurant_cuisines rc ON rc.restaurant_id = r.id
               WHERE rc.restaurant_id IS NULL → должно быть минимум

4.2  Ручная привязка: restaurant_features
     Маппинг полей legacy → features:
       hasWifi = true         → feature 'wifi'
       delivery = 1           → feature 'delivery'
       parkingPlaceCount > 0  → feature 'parking'
       forChildren содержит текст → feature 'kids-menu' (приблизительно)
     Проверка: выборочно 5 ресторанов
```

### Фаза 5 — Меню
```
5.1  Миграция: rest_menu_section → menu_categories
     Фильтр: status = 1
     Зависит от: restaurants
     Проверка: COUNT ~1 000

5.2  Миграция: rest_menu → dishes
     Фильтр: status = 1, title_ru IS NOT NULL
     Преобразования:
       - price: decimal(15,2) рубли → INT копейки (× 100, ROUND)
       - weight: text → INT (только если чисто числовое значение)
       - volume: decimal(15,3) литры → INT мл (× 1000)
       - image LONGBLOB → ПРОПУСТИТЬ (обрабатываем отдельно в фазе 6)
     Проверка: COUNT ~18 000
               SELECT COUNT(*) FROM dishes WHERE price <= 0; → 0
```

### Фаза 6 — Медиа (самая трудоёмкая)
```
6.1  Экспорт LONGBLOB из rest_menu.image
     - Написать отдельный скрипт (stream, не всё в память)
     - Сохранить как файлы: /tmp/dish-images/{menu_id}.jpg
     - Загрузить в S3/MinIO
     - Записать URL в dishes.cover_photo_url или photos
     Проверка: COUNT(загруженных) vs COUNT(rest_menu WHERE image IS NOT NULL)

6.2  Миграция: rest_rest_photo → photos (source='import')
     Поле filename — это относительный путь или имя файла
     Нужно знать base URL старого сервера для полного URL
     Проверка: COUNT ~79 000
               10 случайных URL — проверить доступность

6.3  Миграция: rest_rest_photo_2gis → photos (source='2gis')
     URL уже полный (поле url varchar(512))
     Проверка: COUNT ~95 000

6.4  Миграция: rest_menu_photo → photos (owner_type='dish')
     Проверка: COUNT ~1 800
```

### Фаза 7 — Пользователи и отзывы
```
7.1  Миграция: user (role='user') → users
     Фильтр: role = 'user', status = 1
     Преобразования:
       - email: обязательно NOT NULL (пропускаем без email)
       - name = CONCAT(firstname, ' ', lastname)
       - password_hash: переносим as-is (формат может не совпадать,
         пользователям придётся восстановить пароль)
     Проверка: COUNT(users) ≤ COUNT(user WHERE role='user')
               SELECT COUNT(*) FROM users WHERE email IS NULL; → 0

7.2  Миграция: rest_review → reviews
     Зависит от: restaurants, users
     Преобразования:
       - rating_food = ratingQuality
       - rating_service = ratingService
       - rating_atmosphere = ratingInterior
       - rating_overall = rate (общий)
       - status: 0 → 'pending', 1 → 'approved'
       - author_name = CONCAT(firstname, ' ', lastname) если userId IS NULL
     Проверка: COUNT ~470
               SELECT COUNT(*) FROM reviews WHERE status='approved'; > 0

7.3  Пересчёт рейтингов ресторанов
     После импорта отзывов запустить UPDATE restaurants
     SET rating_* = (SELECT AVG(...) FROM reviews WHERE ...)
     Проверка: SELECT COUNT(*) FROM restaurants WHERE rating_overall > 0;
               Должно равняться ресторанам с approved отзывами
```

### Фаза 8 — Верификация итогов
```
8.1  Счётчики (сверить с ожиданиями из раздела 1 legacy-db-analysis.md)

    Таблица             Ожидаем        Проверка
    ─────────────────── ────────────── ──────────────────────────────
    countries           2-5            SELECT COUNT(*) FROM countries
    cities              222            SELECT COUNT(*) FROM cities
    cuisines            ~73            SELECT COUNT(*) FROM cuisines
    restaurants         ~55 000        SELECT COUNT(*) FROM restaurants
    restaurant_locations ~55 000       SELECT COUNT(*) FROM restaurant_locations
    restaurant_cuisines  ~200 000      SELECT COUNT(*) FROM restaurant_cuisines
    working_hours        ~200 000      SELECT COUNT(*) FROM working_hours
    menu_categories      ~800          SELECT COUNT(*) FROM menu_categories
    dishes               ~16 000       SELECT COUNT(*) FROM dishes
    photos               ~170 000      SELECT COUNT(*) FROM photos
    reviews              ~470          SELECT COUNT(*) FROM reviews
    users                ~5 000        SELECT COUNT(*) FROM users

8.2  Целостность данных
    SELECT COUNT(*) FROM restaurants WHERE city_id IS NULL; → 0
    SELECT COUNT(*) FROM dishes WHERE restaurant_id IS NULL; → 0
    SELECT COUNT(*) FROM restaurant_locations l
      LEFT JOIN restaurants r ON r.id = l.restaurant_id
      WHERE r.id IS NULL; → 0

8.3  Выборочная проверка (10 ресторанов)
    Взять 10 случайных legacy_id из rest_rest
    Открыть в legacy, сравнить с новой БД:
      - имя, город, адрес, средний чек, кухни
    Принять миграцию если расхождений < 5%

8.4  Индексы
    ANALYZE все таблицы
    Проверить план запроса для:
      SELECT * FROM restaurants WHERE city_id = X AND status = 'published'
      → должен использовать idx_restaurants_city

8.5  Публикация
    По умолчанию все перенесённые рестораны → status = 'draft'
    Ручная выборочная проверка → status = 'published'
    ИЛИ массовый перевод если качество данных устраивает
```

---

## 6. Риски и как с ними работать

| Риск | Вероятность | Как решать |
|------|------------|-----------|
| Имена ресторанов без slug (иероглифы, только цифры) | Низкая | Fallback: "restaurant-{legacy_id}" |
| Дублирующиеся slug при slugify | Средняя | Добавляем суффикс "-2", "-3" |
| rest_menu.image LONGBLOB может быть битым | Средняя | Проверять magic bytes перед загрузкой в S3 |
| rest_rest.phone содержит несколько номеров через запятую | Высокая | Брать первый номер до запятой |
| work_time_* содержит мусор (не HH:MM формат) | Высокая | Парсить с try/catch, пропускать битые |
| rest_rest.avgBill = 0 (не заполнено) | Высокая | NULL вместо 0 |
| ~6.5M rest_rest2kitchen — большинство с 2ГИС, могут быть неточными | Средняя | Переносим, но помечаем source='legacy' |
| Пользователи без email | Средняя | Пропускаем (нет возможности аутентифицировать) |
| Хеши паролей в legacy могут быть MD5 | Высокая | Пометить флагом "password_needs_reset", при входе перехешировать |
