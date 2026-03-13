import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDistrictLegacyAndCategorySlug1710144300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add legacy_id to districts (for pipeline import mapping)
    await queryRunner.query(`
      ALTER TABLE "districts"
        ADD COLUMN IF NOT EXISTS "legacy_id" INT UNIQUE;
    `);

    // 2. Make city_id nullable in districts (some districts may not resolve a city)
    await queryRunner.query(`
      ALTER TABLE "districts"
        ALTER COLUMN "city_id" DROP NOT NULL;
    `);

    // 3. Add slug to menu_categories
    await queryRunner.query(`
      ALTER TABLE "menu_categories"
        ADD COLUMN IF NOT EXISTS "slug" VARCHAR(200);
    `);

    // 4. Index on districts.legacy_id for import lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_districts_legacy_id" ON "districts"("legacy_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_districts_legacy_id";`);
    await queryRunner.query(`ALTER TABLE "menu_categories" DROP COLUMN IF EXISTS "slug";`);
    await queryRunner.query(`ALTER TABLE "districts" ALTER COLUMN "city_id" SET NOT NULL;`);
    await queryRunner.query(`ALTER TABLE "districts" DROP COLUMN IF EXISTS "legacy_id";`);
  }
}
