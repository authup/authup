import { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1671030606921 implements MigrationInterface {
    name = 'Default1671030606921';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_clients" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(256) NOT NULL,
                "description" text,
                "secret" varchar(256),
                "redirect_uri" varchar(2000),
                "grant_types" varchar(512),
                "scope" varchar(512),
                "base_url" varchar(2000),
                "root_url" varchar(2000),
                "is_confidential" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "user_id" varchar,
                CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_clients"(
                    "id",
                    "name",
                    "description",
                    "secret",
                    "redirect_uri",
                    "grant_types",
                    "scope",
                    "base_url",
                    "root_url",
                    "is_confidential",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "user_id"
                )
            SELECT "id",
                "name",
                "description",
                "secret",
                "redirect_uri",
                "grant_types",
                "scope",
                "base_url",
                "root_url",
                "is_confidential",
                "created_at",
                "updated_at",
                "realm_id",
                "user_id"
            FROM "auth_clients"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_clients"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_clients"
                RENAME TO "auth_clients"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_scopes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "name" varchar(128) NOT NULL,
                "description" text,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                CONSTRAINT "UQ_b14fab23784a81c282abef41fae" UNIQUE ("name", "realm_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_clients" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(256) NOT NULL,
                "description" text,
                "secret" varchar(256),
                "redirect_uri" text,
                "grant_types" varchar(512),
                "scope" varchar(512),
                "base_url" varchar(2000),
                "root_url" varchar(2000),
                "is_confidential" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "user_id" varchar,
                CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_clients"(
                    "id",
                    "name",
                    "description",
                    "secret",
                    "redirect_uri",
                    "grant_types",
                    "scope",
                    "base_url",
                    "root_url",
                    "is_confidential",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "user_id"
                )
            SELECT "id",
                "name",
                "description",
                "secret",
                "redirect_uri",
                "grant_types",
                "scope",
                "base_url",
                "root_url",
                "is_confidential",
                "created_at",
                "updated_at",
                "realm_id",
                "user_id"
            FROM "auth_clients"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_clients"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_clients"
                RENAME TO "auth_clients"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_scopes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "name" varchar(128) NOT NULL,
                "description" text,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                CONSTRAINT "UQ_b14fab23784a81c282abef41fae" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_69e83c8e7e11a247a0809eb3327" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_scopes"(
                    "id",
                    "built_in",
                    "name",
                    "description",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "built_in",
                "name",
                "description",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "auth_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_scopes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_scopes"
                RENAME TO "auth_scopes"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_scopes"
                RENAME TO "temporary_auth_scopes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_scopes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "name" varchar(128) NOT NULL,
                "description" text,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                CONSTRAINT "UQ_b14fab23784a81c282abef41fae" UNIQUE ("name", "realm_id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_scopes"(
                    "id",
                    "built_in",
                    "name",
                    "description",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "built_in",
                "name",
                "description",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "temporary_auth_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_scopes"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
                RENAME TO "temporary_auth_clients"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_clients" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(256) NOT NULL,
                "description" text,
                "secret" varchar(256),
                "redirect_uri" varchar(2000),
                "grant_types" varchar(512),
                "scope" varchar(512),
                "base_url" varchar(2000),
                "root_url" varchar(2000),
                "is_confidential" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "user_id" varchar,
                CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_clients"(
                    "id",
                    "name",
                    "description",
                    "secret",
                    "redirect_uri",
                    "grant_types",
                    "scope",
                    "base_url",
                    "root_url",
                    "is_confidential",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "user_id"
                )
            SELECT "id",
                "name",
                "description",
                "secret",
                "redirect_uri",
                "grant_types",
                "scope",
                "base_url",
                "root_url",
                "is_confidential",
                "created_at",
                "updated_at",
                "realm_id",
                "user_id"
            FROM "temporary_auth_clients"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_clients"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_scopes"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
                RENAME TO "temporary_auth_clients"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_clients" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(256) NOT NULL,
                "description" text,
                "secret" varchar(256),
                "redirect_uri" varchar(2000),
                "grant_types" varchar(512),
                "scope" varchar(512),
                "base_url" varchar(2000),
                "root_url" varchar(2000),
                "is_confidential" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "user_id" varchar,
                CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_clients"(
                    "id",
                    "name",
                    "description",
                    "secret",
                    "redirect_uri",
                    "grant_types",
                    "scope",
                    "base_url",
                    "root_url",
                    "is_confidential",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "user_id"
                )
            SELECT "id",
                "name",
                "description",
                "secret",
                "redirect_uri",
                "grant_types",
                "scope",
                "base_url",
                "root_url",
                "is_confidential",
                "created_at",
                "updated_at",
                "realm_id",
                "user_id"
            FROM "temporary_auth_clients"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_clients"
        `);
    }
}
