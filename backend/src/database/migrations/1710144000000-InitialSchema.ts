import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710144000000 implements MigrationInterface {
  name = 'InitialSchema1710144000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Reference tables ───────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(150) NOT NULL,
        "slug" varchar(150) NOT NULL,
        "country" varchar(100) NOT NULL DEFAULT 'Россия',
        "legacy_id" int UNIQUE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cities_slug" ON "cities" ("slug")`);

    await queryRunner.query(`
      CREATE TABLE "cuisines" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "legacy_id" int UNIQUE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cuisines_slug" ON "cuisines" ("slug")`);

    await queryRunner.query(`
      CREATE TABLE "allergens" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "slug" varchar(50) NOT NULL,
        "icon" varchar(10),
        "eu_code" varchar(5)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_allergens_slug" ON "allergens" ("slug")`);

    await queryRunner.query(`
      CREATE TABLE "features" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "slug" varchar(50) NOT NULL,
        "category" varchar(50) NOT NULL,
        "icon" varchar(10)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_features_slug" ON "features" ("slug")`);

    await queryRunner.query(`
      CREATE TABLE "restaurant_chains" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(200) NOT NULL,
        "slug" varchar(200) NOT NULL,
        "legacy_id" int UNIQUE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_restaurant_chains_slug" ON "restaurant_chains" ("slug")`);

    // ─── Main tables ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "restaurants" (
        "id" SERIAL PRIMARY KEY,
        "chain_id" int REFERENCES "restaurant_chains"("id") ON DELETE SET NULL,
        "name" varchar(200) NOT NULL,
        "slug" varchar(200) NOT NULL,
        "description" text,
        "city_id" int NOT NULL REFERENCES "cities"("id"),
        "address" varchar(300),
        "metro_station" varchar(100),
        "lat" decimal(9,6),
        "lng" decimal(9,6),
        "phone" varchar(100),
        "website" varchar(300),
        "price_level" smallint,
        "average_bill" int,
        "has_wifi" boolean NOT NULL DEFAULT false,
        "has_delivery" boolean NOT NULL DEFAULT false,
        "rating" decimal(3,2) NOT NULL DEFAULT 0,
        "review_count" int NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "legacy_id" int UNIQUE,
        "external_2gis_id" varchar(255)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_restaurants_slug" ON "restaurants" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_restaurants_status" ON "restaurants" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "dishes" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(300) NOT NULL,
        "description" text,
        "composition" text,
        "calories" int,
        "protein" decimal(6,1),
        "fat" decimal(6,1),
        "carbs" decimal(6,1),
        "weight_grams" int,
        "volume_ml" int,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "legacy_id" int UNIQUE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" varchar(200) NOT NULL,
        "password_hash" varchar(200),
        "name" varchar(100),
        "avatar_url" varchar(500),
        "city_id" int REFERENCES "cities"("id"),
        "loyalty_points" int NOT NULL DEFAULT 0,
        "loyalty_level" varchar(20) NOT NULL DEFAULT 'bronze',
        "auth_provider" varchar(20) NOT NULL DEFAULT 'email',
        "auth_provider_id" varchar(200),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);

    // ─── Dependent tables ───────────────────────────
    await queryRunner.query(`
      CREATE TABLE "restaurant_dishes" (
        "id" SERIAL PRIMARY KEY,
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "dish_id" int NOT NULL REFERENCES "dishes"("id") ON DELETE CASCADE,
        "category_name" varchar(200),
        "price" int NOT NULL,
        "is_available" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        UNIQUE ("restaurant_id", "dish_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "working_hours" (
        "id" SERIAL PRIMARY KEY,
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "day_of_week" smallint NOT NULL,
        "open_time" time,
        "close_time" time,
        "is_closed" boolean NOT NULL DEFAULT false,
        UNIQUE ("restaurant_id", "day_of_week")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "photos" (
        "id" SERIAL PRIMARY KEY,
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "url" varchar(500) NOT NULL,
        "sort_order" int NOT NULL DEFAULT 0,
        "is_cover" boolean NOT NULL DEFAULT false,
        "source" varchar(50) NOT NULL DEFAULT 'internal',
        "legacy_id" int,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" SERIAL PRIMARY KEY,
        "user_id" int REFERENCES "users"("id") ON DELETE SET NULL,
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "rating_food" smallint,
        "rating_service" smallint,
        "rating_atmosphere" smallint,
        "rating_value" smallint,
        "rating_overall" decimal(3,2) NOT NULL,
        "text" text,
        "author_name" varchar(100),
        "is_verified" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "reply_text" text,
        "legacy_id" int UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" SERIAL PRIMARY KEY,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "booking_date" date NOT NULL,
        "booking_time" time NOT NULL,
        "guests_count" smallint NOT NULL,
        "contact_name" varchar(100) NOT NULL,
        "contact_phone" varchar(30) NOT NULL,
        "comment" text,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_bookings_booking_date" ON "bookings" ("booking_date")`);

    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" SERIAL PRIMARY KEY,
        "title" varchar(300) NOT NULL,
        "slug" varchar(300) NOT NULL,
        "excerpt" text,
        "body" text NOT NULL,
        "cover_url" varchar(500),
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "seo_title" varchar(300),
        "seo_description" varchar(500),
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_articles_slug" ON "articles" ("slug")`);

    // ─── Junction tables ────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "restaurant_cuisines" (
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "cuisine_id" int NOT NULL REFERENCES "cuisines"("id") ON DELETE CASCADE,
        PRIMARY KEY ("restaurant_id", "cuisine_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_restaurant_cuisines_restaurant" ON "restaurant_cuisines" ("restaurant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_restaurant_cuisines_cuisine" ON "restaurant_cuisines" ("cuisine_id")`);

    await queryRunner.query(`
      CREATE TABLE "restaurant_features" (
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "feature_id" int NOT NULL REFERENCES "features"("id") ON DELETE CASCADE,
        PRIMARY KEY ("restaurant_id", "feature_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_restaurant_features_restaurant" ON "restaurant_features" ("restaurant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_restaurant_features_feature" ON "restaurant_features" ("feature_id")`);

    await queryRunner.query(`
      CREATE TABLE "user_favorites" (
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        PRIMARY KEY ("user_id", "restaurant_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_user_favorites_user" ON "user_favorites" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_favorites_restaurant" ON "user_favorites" ("restaurant_id")`);

    await queryRunner.query(`
      CREATE TABLE "article_restaurants" (
        "article_id" int NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
        "restaurant_id" int NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        PRIMARY KEY ("article_id", "restaurant_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_article_restaurants_article" ON "article_restaurants" ("article_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_article_restaurants_restaurant" ON "article_restaurants" ("restaurant_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Junction tables
    await queryRunner.query(`DROP TABLE "article_restaurants"`);
    await queryRunner.query(`DROP TABLE "user_favorites"`);
    await queryRunner.query(`DROP TABLE "restaurant_features"`);
    await queryRunner.query(`DROP TABLE "restaurant_cuisines"`);

    // Dependent tables
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TABLE "photos"`);
    await queryRunner.query(`DROP TABLE "working_hours"`);
    await queryRunner.query(`DROP TABLE "restaurant_dishes"`);

    // Main tables
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "dishes"`);
    await queryRunner.query(`DROP TABLE "restaurants"`);

    // Reference tables
    await queryRunner.query(`DROP TABLE "restaurant_chains"`);
    await queryRunner.query(`DROP TABLE "features"`);
    await queryRunner.query(`DROP TABLE "allergens"`);
    await queryRunner.query(`DROP TABLE "cuisines"`);
    await queryRunner.query(`DROP TABLE "cities"`);
  }
}
