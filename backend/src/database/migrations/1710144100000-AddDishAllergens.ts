import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDishAllergens1710144100000 implements MigrationInterface {
  name = 'AddDishAllergens1710144100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add image_url to dishes
    await queryRunner.query(`
      ALTER TABLE "dishes" ADD COLUMN IF NOT EXISTS "image_url" varchar(500)
    `);

    // Create dish_allergens junction table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dish_allergens" (
        "dish_id" int NOT NULL REFERENCES "dishes"("id") ON DELETE CASCADE,
        "allergen_id" int NOT NULL REFERENCES "allergens"("id") ON DELETE CASCADE,
        "severity" varchar(20) NOT NULL DEFAULT 'may_contain',
        PRIMARY KEY ("dish_id", "allergen_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dish_allergens_dish" ON "dish_allergens" ("dish_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dish_allergens_allergen" ON "dish_allergens" ("allergen_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dish_allergens"`);
    await queryRunner.query(`ALTER TABLE "dishes" DROP COLUMN IF EXISTS "image_url"`);
  }
}
