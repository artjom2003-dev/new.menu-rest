import { MigrationInterface, QueryRunner } from 'typeorm';

export class MenuTaxonomy1710144600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. CREATE TABLE dish_categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dish_categories" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "icon" VARCHAR(50),
        "sort_order" INT DEFAULT 0
      );
    `);

    // 2. CREATE TABLE dish_subcategories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dish_subcategories" (
        "id" SERIAL PRIMARY KEY,
        "category_id" INT NOT NULL REFERENCES "dish_categories"("id") ON DELETE CASCADE,
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL,
        "sort_order" INT DEFAULT 0,
        UNIQUE("category_id", "slug")
      );
    `);

    // 3. CREATE TABLE cooking_methods
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cooking_methods" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE
      );
    `);

    // 4. CREATE TABLE protein_types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "protein_types" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "is_meat" BOOLEAN DEFAULT TRUE,
        "is_seafood" BOOLEAN DEFAULT FALSE
      );
    `);

    // 5. CREATE TABLE flavor_profiles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "flavor_profiles" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "taste_sweet" INT DEFAULT 0,
        "taste_sour" INT DEFAULT 0,
        "taste_salty" INT DEFAULT 0,
        "taste_spicy" INT DEFAULT 0
      );
    `);

    // 6. CREATE TABLE dish_tags
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dish_tags" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "tag_type" VARCHAR(50),
        "icon" VARCHAR(50)
      );
    `);

    // 7. CREATE TABLE dish_dish_tags (many-to-many)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dish_dish_tags" (
        "dish_id" INT NOT NULL REFERENCES "dishes"("id") ON DELETE CASCADE,
        "tag_id" INT NOT NULL REFERENCES "dish_tags"("id") ON DELETE CASCADE,
        PRIMARY KEY ("dish_id", "tag_id")
      );
    `);

    // 8. CREATE TABLE dish_cooking_methods (many-to-many)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dish_cooking_methods" (
        "dish_id" INT NOT NULL REFERENCES "dishes"("id") ON DELETE CASCADE,
        "cooking_method_id" INT NOT NULL REFERENCES "cooking_methods"("id") ON DELETE CASCADE,
        PRIMARY KEY ("dish_id", "cooking_method_id")
      );
    `);

    // 9. CREATE TABLE dish_flavor_profiles (many-to-many)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dish_flavor_profiles" (
        "dish_id" INT NOT NULL REFERENCES "dishes"("id") ON DELETE CASCADE,
        "flavor_profile_id" INT NOT NULL REFERENCES "flavor_profiles"("id") ON DELETE CASCADE,
        PRIMARY KEY ("dish_id", "flavor_profile_id")
      );
    `);

    // 10. ALTER TABLE dishes — add taxonomy columns
    await queryRunner.query(`
      ALTER TABLE "dishes"
        ADD COLUMN IF NOT EXISTS "subcategory_id" INT REFERENCES "dish_subcategories"("id"),
        ADD COLUMN IF NOT EXISTS "protein_type_id" INT REFERENCES "protein_types"("id"),
        ADD COLUMN IF NOT EXISTS "taste_sweet" INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taste_sour" INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taste_salty" INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taste_bitter" INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taste_umami" INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taste_spicy" INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "is_vegetarian" BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "is_vegan" BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "spicy_level" INT DEFAULT 0;
    `);

    // 11. Add CHECK constraints on taste columns (0-10)
    await queryRunner.query(`
      ALTER TABLE "dishes"
        ADD CONSTRAINT "CHK_dishes_taste_sweet" CHECK ("taste_sweet" >= 0 AND "taste_sweet" <= 10),
        ADD CONSTRAINT "CHK_dishes_taste_sour" CHECK ("taste_sour" >= 0 AND "taste_sour" <= 10),
        ADD CONSTRAINT "CHK_dishes_taste_salty" CHECK ("taste_salty" >= 0 AND "taste_salty" <= 10),
        ADD CONSTRAINT "CHK_dishes_taste_bitter" CHECK ("taste_bitter" >= 0 AND "taste_bitter" <= 10),
        ADD CONSTRAINT "CHK_dishes_taste_umami" CHECK ("taste_umami" >= 0 AND "taste_umami" <= 10),
        ADD CONSTRAINT "CHK_dishes_taste_spicy" CHECK ("taste_spicy" >= 0 AND "taste_spicy" <= 10);
    `);

    // 12. Add CHECK constraint on spicy_level (0-3)
    await queryRunner.query(`
      ALTER TABLE "dishes"
        ADD CONSTRAINT "CHK_dishes_spicy_level" CHECK ("spicy_level" >= 0 AND "spicy_level" <= 3);
    `);

    // 13. CREATE indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dishes_subcategory" ON "dishes"("subcategory_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dishes_protein" ON "dishes"("protein_type_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dishes_protein";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dishes_subcategory";`);

    // Drop CHECK constraints
    await queryRunner.query(`ALTER TABLE "dishes" DROP CONSTRAINT IF EXISTS "CHK_dishes_spicy_level";`);
    await queryRunner.query(`ALTER TABLE "dishes" DROP CONSTRAINT IF EXISTS "CHK_dishes_taste_spicy";`);
    await queryRunner.query(`ALTER TABLE "dishes" DROP CONSTRAINT IF EXISTS "CHK_dishes_taste_umami";`);
    await queryRunner.query(`ALTER TABLE "dishes" DROP CONSTRAINT IF EXISTS "CHK_dishes_taste_bitter";`);
    await queryRunner.query(`ALTER TABLE "dishes" DROP CONSTRAINT IF EXISTS "CHK_dishes_taste_salty";`);
    await queryRunner.query(`ALTER TABLE "dishes" DROP CONSTRAINT IF EXISTS "CHK_dishes_taste_sour";`);
    await queryRunner.query(`ALTER TABLE "dishes" DROP CONSTRAINT IF EXISTS "CHK_dishes_taste_sweet";`);

    // Drop columns from dishes
    await queryRunner.query(`
      ALTER TABLE "dishes"
        DROP COLUMN IF EXISTS "spicy_level",
        DROP COLUMN IF EXISTS "is_vegan",
        DROP COLUMN IF EXISTS "is_vegetarian",
        DROP COLUMN IF EXISTS "taste_spicy",
        DROP COLUMN IF EXISTS "taste_umami",
        DROP COLUMN IF EXISTS "taste_bitter",
        DROP COLUMN IF EXISTS "taste_salty",
        DROP COLUMN IF EXISTS "taste_sour",
        DROP COLUMN IF EXISTS "taste_sweet",
        DROP COLUMN IF EXISTS "protein_type_id",
        DROP COLUMN IF EXISTS "subcategory_id";
    `);

    // Drop junction tables
    await queryRunner.query(`DROP TABLE IF EXISTS "dish_flavor_profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dish_cooking_methods";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dish_dish_tags";`);

    // Drop reference tables
    await queryRunner.query(`DROP TABLE IF EXISTS "dish_tags";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "flavor_profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "protein_types";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cooking_methods";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dish_subcategories";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dish_categories";`);
  }
}
