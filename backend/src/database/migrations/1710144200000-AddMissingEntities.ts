import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingEntities1710144200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. CREATE TABLE districts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "districts" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(200) NOT NULL,
        "slug" VARCHAR(200) NOT NULL UNIQUE,
        "city_id" INT NOT NULL REFERENCES "cities"("id")
      );
    `);

    // 2. CREATE TABLE restaurant_locations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "restaurant_locations" (
        "id" SERIAL PRIMARY KEY,
        "restaurant_id" INT NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "city_id" INT REFERENCES "cities"("id"),
        "district_id" INT REFERENCES "districts"("id"),
        "address" VARCHAR(500),
        "lat" DECIMAL(10,7),
        "lng" DECIMAL(10,7),
        "metro_station" VARCHAR(200),
        "phone" VARCHAR(50),
        "is_primary" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. CREATE TABLE menu_categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_categories" (
        "id" SERIAL PRIMARY KEY,
        "restaurant_id" INT NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "name" VARCHAR(200) NOT NULL,
        "sort_order" INT DEFAULT 0
      );
    `);

    // 4. ALTER TABLE restaurants
    await queryRunner.query(`
      ALTER TABLE "restaurants"
        ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMPTZ;
    `);

    // 5. ALTER TABLE photos
    await queryRunner.query(`
      ALTER TABLE "photos"
        ADD COLUMN IF NOT EXISTS "alt_text" VARCHAR(500),
        ADD COLUMN IF NOT EXISTS "thumbnail_url" VARCHAR(500);
    `);

    // 6. ALTER TABLE dishes
    await queryRunner.query(`
      ALTER TABLE "dishes"
        ADD COLUMN IF NOT EXISTS "is_healthy_choice" BOOLEAN DEFAULT FALSE;
    `);

    // 7. ALTER TABLE articles
    await queryRunner.query(`
      ALTER TABLE "articles"
        ADD COLUMN IF NOT EXISTS "category" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "city_id" INT,
        ADD COLUMN IF NOT EXISTS "author_name" VARCHAR(200),
        ADD COLUMN IF NOT EXISTS "views_count" INT DEFAULT 0;
    `);

    // 8. ALTER TABLE cuisines
    await queryRunner.query(`
      ALTER TABLE "cuisines"
        ADD COLUMN IF NOT EXISTS "icon" VARCHAR(10);
    `);

    // 9. ALTER TABLE restaurant_dishes
    await queryRunner.query(`
      ALTER TABLE "restaurant_dishes"
        ADD COLUMN IF NOT EXISTS "menu_category_id" INT REFERENCES "menu_categories"("id");
    `);

    // 10. CREATE indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_districts_city_id" ON "districts"("city_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_restaurant_locations_restaurant_id" ON "restaurant_locations"("restaurant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_restaurant_locations_city_id" ON "restaurant_locations"("city_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_restaurant_locations_district_id" ON "restaurant_locations"("district_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_menu_categories_restaurant_id" ON "menu_categories"("restaurant_id");
    `);

    // 11. Populate restaurant_locations from existing restaurant data
    await queryRunner.query(`
      INSERT INTO "restaurant_locations" ("restaurant_id", "city_id", "address", "lat", "lng", "metro_station", "phone", "is_primary")
      SELECT "id", "city_id", "address", "lat", "lng", "metro_station", "phone", TRUE
      FROM "restaurants"
      WHERE "address" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "restaurant_locations" WHERE "restaurant_locations"."restaurant_id" = "restaurants"."id"
      );
    `);

    // 12. Populate menu_categories from distinct categoryName in restaurant_dishes
    await queryRunner.query(`
      INSERT INTO "menu_categories" ("restaurant_id", "name")
      SELECT DISTINCT "restaurant_id", "category_name"
      FROM "restaurant_dishes"
      WHERE "category_name" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "menu_categories" mc
        WHERE mc."restaurant_id" = "restaurant_dishes"."restaurant_id"
          AND mc."name" = "restaurant_dishes"."category_name"
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 9. DROP column from restaurant_dishes
    await queryRunner.query(`
      ALTER TABLE "restaurant_dishes" DROP COLUMN IF EXISTS "menu_category_id";
    `);

    // 8. DROP column from cuisines
    await queryRunner.query(`
      ALTER TABLE "cuisines" DROP COLUMN IF EXISTS "icon";
    `);

    // 7. DROP columns from articles
    await queryRunner.query(`
      ALTER TABLE "articles"
        DROP COLUMN IF EXISTS "category",
        DROP COLUMN IF EXISTS "city_id",
        DROP COLUMN IF EXISTS "author_name",
        DROP COLUMN IF EXISTS "views_count";
    `);

    // 6. DROP column from dishes
    await queryRunner.query(`
      ALTER TABLE "dishes" DROP COLUMN IF EXISTS "is_healthy_choice";
    `);

    // 5. DROP columns from photos
    await queryRunner.query(`
      ALTER TABLE "photos"
        DROP COLUMN IF EXISTS "alt_text",
        DROP COLUMN IF EXISTS "thumbnail_url";
    `);

    // 4. DROP columns from restaurants
    await queryRunner.query(`
      ALTER TABLE "restaurants"
        DROP COLUMN IF EXISTS "is_verified",
        DROP COLUMN IF EXISTS "published_at";
    `);

    // 3. DROP TABLE menu_categories
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_categories";`);

    // 2. DROP TABLE restaurant_locations
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_locations";`);

    // 1. DROP TABLE districts
    await queryRunner.query(`DROP TABLE IF EXISTS "districts";`);
  }
}
