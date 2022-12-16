import { MigrationInterface, QueryRunner } from 'typeorm';
export class Default1671093405047 implements MigrationInterface {
    name = 'Default1671093405047';
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_client_scopes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "default" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "client_id" varchar NOT NULL,
                "scope_id" varchar NOT NULL,
                CONSTRAINT "UQ_ddec4250b145536333f137ff963" UNIQUE ("client_id", "scope_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_client_scopes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "default" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "client_id" varchar NOT NULL,
                "scope_id" varchar NOT NULL,
                CONSTRAINT "UQ_ddec4250b145536333f137ff963" UNIQUE ("client_id", "scope_id"),
                CONSTRAINT "FK_6331374fa74645dae2d52547081" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_471f3da9df80f92c382a586e9ca" FOREIGN KEY ("scope_id") REFERENCES "auth_scopes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_client_scopes"(
                    "id",
                    "default",
                    "created_at",
                    "updated_at",
                    "client_id",
                    "scope_id"
                )
            SELECT "id",
                "default",
                "created_at",
                "updated_at",
                "client_id",
                "scope_id"
            FROM "auth_client_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_scopes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_client_scopes"
                RENAME TO "auth_client_scopes"
        `);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_client_scopes"
                RENAME TO "temporary_auth_client_scopes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_client_scopes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "default" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "client_id" varchar NOT NULL,
                "scope_id" varchar NOT NULL,
                CONSTRAINT "UQ_ddec4250b145536333f137ff963" UNIQUE ("client_id", "scope_id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_client_scopes"(
                    "id",
                    "default",
                    "created_at",
                    "updated_at",
                    "client_id",
                    "scope_id"
                )
            SELECT "id",
                "default",
                "created_at",
                "updated_at",
                "client_id",
                "scope_id"
            FROM "temporary_auth_client_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_client_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_scopes"
        `);
    }
}
