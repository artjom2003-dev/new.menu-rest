import { MigrationInterface, QueryRunner } from 'typeorm';

export class GastroProfile1710144700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. user_taste_profiles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_taste_profiles" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "axes" JSONB NOT NULL,
        "archetype" VARCHAR(50) NOT NULL,
        "dietary" TEXT[] DEFAULT '{}',
        "raw_answers" JSONB NOT NULL,
        "wine_prefs" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_taste_profiles_user_id"
        ON "user_taste_profiles"("user_id");
    `);

    // 2. restaurant_taste_vectors
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "restaurant_taste_vectors" (
        "id" SERIAL PRIMARY KEY,
        "restaurant_id" INT NOT NULL UNIQUE REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "axes" JSONB NOT NULL,
        "confidence" FLOAT DEFAULT 0,
        "source" VARCHAR(30) DEFAULT 'computed',
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_restaurant_taste_vectors_restaurant_id"
        ON "restaurant_taste_vectors"("restaurant_id");
    `);

    // 3. dish_taste_vectors
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dish_taste_vectors" (
        "id" SERIAL PRIMARY KEY,
        "dish_id" INT NOT NULL REFERENCES "dishes"("id") ON DELETE CASCADE,
        "restaurant_id" INT NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "axes" JSONB NOT NULL,
        "pairing_wines" JSONB,
        "pairing_reason" TEXT,
        "source" VARCHAR(30) DEFAULT 'computed',
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dish_taste_vectors_dish_id"
        ON "dish_taste_vectors"("dish_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dish_taste_vectors_restaurant_id"
        ON "dish_taste_vectors"("restaurant_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dish_taste_vectors";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_taste_vectors";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_taste_profiles";`);
  }
}
