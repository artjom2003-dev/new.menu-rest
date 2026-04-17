import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanionsTable1710144800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "companions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "companion_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE("user_id", "companion_id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_companions_user" ON "companions" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_companions_companion" ON "companions" ("companion_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_companions_status" ON "companions" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "companions"`);
  }
}
