import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1739452698831 implements MigrationInterface {
    name = 'Default1739452698831';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD "client_id" uuid
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8f460e65af897b9b049f582ad0" ON "auth_roles" ("client_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "UQ_561d1b8a5a7db602df418d7cd53" UNIQUE ("name", "client_id", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD CONSTRAINT "UQ_5456fbd03999de8005f6bb88bd8" UNIQUE ("name", "client_id", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD CONSTRAINT "FK_8f460e65af897b9b049f582ad0e" FOREIGN KEY ("client_id") REFERENCES "auth_realms"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP CONSTRAINT "FK_8f460e65af897b9b049f582ad0e"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP CONSTRAINT "UQ_5456fbd03999de8005f6bb88bd8"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "UQ_561d1b8a5a7db602df418d7cd53"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8f460e65af897b9b049f582ad0"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP COLUMN "client_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b" UNIQUE ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b" UNIQUE ("name", "realm_id")
        `);
    }
}
