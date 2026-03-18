import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRestaurantRequests1710144400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "restaurant_requests" (
        "id" SERIAL PRIMARY KEY,
        "restaurant_name" varchar(200) NOT NULL,
        "city" varchar(100) NOT NULL,
        "address" varchar(300) NOT NULL,
        "contact_name" varchar(100) NOT NULL,
        "contact_phone" varchar(30) NOT NULL,
        "contact_email" varchar(200) NOT NULL,
        "website" varchar(500),
        "comment" text,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "admin_note" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_restaurant_requests_status" ON "restaurant_requests" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_requests"`);
  }
}
