import { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1660292821284 implements MigrationInterface {
    name = 'Default1660292821284';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "sub" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64) NOT NULL,
                "protocol_config" varchar(64),
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ef51081221725c5c073a6045eb" ON "auth_identity_providers" ("sub", "realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "provider_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_994a26636cc20da801d5ef4ee40" UNIQUE ("name", "provider_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_accounts" (
                "id" varchar PRIMARY KEY NOT NULL,
                "access_token" text,
                "refresh_token" text,
                "provider_user_id" varchar(256) NOT NULL,
                "provider_user_name" varchar(256),
                "provider_user_email" varchar(512),
                "expires_in" integer,
                "expires_at" datetime,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "provider_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_96a230c697b83505e073713507" ON "auth_identity_provider_accounts" ("provider_id", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "external_id" varchar(36) NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_42df2e30eee05e54c74bced78b" ON "auth_identity_provider_roles" ("provider_id", "external_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_fadb9ce4df580cc42e78b74b2f" ON "auth_identity_provider_roles" ("provider_id", "role_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_ef51081221725c5c073a6045eb"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "sub" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64) NOT NULL,
                "protocol_config" varchar(64),
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_providers"(
                    "id",
                    "sub",
                    "name",
                    "protocol",
                    "protocol_config",
                    "enabled",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "sub",
                "name",
                "protocol",
                "protocol_config",
                "enabled",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "auth_identity_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_providers"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_identity_providers"
                RENAME TO "auth_identity_providers"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ef51081221725c5c073a6045eb" ON "auth_identity_providers" ("sub", "realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_provider_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "provider_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_994a26636cc20da801d5ef4ee40" UNIQUE ("name", "provider_id"),
                CONSTRAINT "FK_5ac40c5ce92142639df65a33e53" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_provider_attributes"(
                    "id",
                    "name",
                    "value",
                    "provider_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "provider_id",
                "created_at",
                "updated_at"
            FROM "auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_identity_provider_attributes"
                RENAME TO "auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_96a230c697b83505e073713507"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_provider_accounts" (
                "id" varchar PRIMARY KEY NOT NULL,
                "access_token" text,
                "refresh_token" text,
                "provider_user_id" varchar(256) NOT NULL,
                "provider_user_name" varchar(256),
                "provider_user_email" varchar(512),
                "expires_in" integer,
                "expires_at" datetime,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "provider_id" varchar NOT NULL,
                CONSTRAINT "FK_b07582d2705a04c2e868e6c3742" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_a82bbdf79b8accbfe71326dce00" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_provider_accounts"(
                    "id",
                    "access_token",
                    "refresh_token",
                    "provider_user_id",
                    "provider_user_name",
                    "provider_user_email",
                    "expires_in",
                    "expires_at",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "provider_id"
                )
            SELECT "id",
                "access_token",
                "refresh_token",
                "provider_user_id",
                "provider_user_name",
                "provider_user_email",
                "expires_in",
                "expires_at",
                "created_at",
                "updated_at",
                "user_id",
                "provider_id"
            FROM "auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_identity_provider_accounts"
                RENAME TO "auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_96a230c697b83505e073713507" ON "auth_identity_provider_accounts" ("provider_id", "user_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_42df2e30eee05e54c74bced78b"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_fadb9ce4df580cc42e78b74b2f"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_provider_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "external_id" varchar(36) NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar,
                CONSTRAINT "FK_f32f792ca1aeacea0507ef80a11" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2c3139bd232ffde35b71d43018e" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_52a568200844cde16722b9bb95e" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d49fb54b140869696a5a14285c7" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_provider_roles"(
                    "id",
                    "external_id",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "provider_id",
                    "provider_realm_id"
                )
            SELECT "id",
                "external_id",
                "created_at",
                "updated_at",
                "role_id",
                "role_realm_id",
                "provider_id",
                "provider_realm_id"
            FROM "auth_identity_provider_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_roles"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_identity_provider_roles"
                RENAME TO "auth_identity_provider_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_42df2e30eee05e54c74bced78b" ON "auth_identity_provider_roles" ("provider_id", "external_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_fadb9ce4df580cc42e78b74b2f" ON "auth_identity_provider_roles" ("provider_id", "role_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_fadb9ce4df580cc42e78b74b2f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_42df2e30eee05e54c74bced78b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles"
                RENAME TO "temporary_auth_identity_provider_roles"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "external_id" varchar(36) NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_provider_roles"(
                    "id",
                    "external_id",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "provider_id",
                    "provider_realm_id"
                )
            SELECT "id",
                "external_id",
                "created_at",
                "updated_at",
                "role_id",
                "role_realm_id",
                "provider_id",
                "provider_realm_id"
            FROM "temporary_auth_identity_provider_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_provider_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_fadb9ce4df580cc42e78b74b2f" ON "auth_identity_provider_roles" ("provider_id", "role_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_42df2e30eee05e54c74bced78b" ON "auth_identity_provider_roles" ("provider_id", "external_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_96a230c697b83505e073713507"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_accounts"
                RENAME TO "temporary_auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_accounts" (
                "id" varchar PRIMARY KEY NOT NULL,
                "access_token" text,
                "refresh_token" text,
                "provider_user_id" varchar(256) NOT NULL,
                "provider_user_name" varchar(256),
                "provider_user_email" varchar(512),
                "expires_in" integer,
                "expires_at" datetime,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "provider_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_provider_accounts"(
                    "id",
                    "access_token",
                    "refresh_token",
                    "provider_user_id",
                    "provider_user_name",
                    "provider_user_email",
                    "expires_in",
                    "expires_at",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "provider_id"
                )
            SELECT "id",
                "access_token",
                "refresh_token",
                "provider_user_id",
                "provider_user_name",
                "provider_user_email",
                "expires_in",
                "expires_at",
                "created_at",
                "updated_at",
                "user_id",
                "provider_id"
            FROM "temporary_auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_96a230c697b83505e073713507" ON "auth_identity_provider_accounts" ("provider_id", "user_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attributes"
                RENAME TO "temporary_auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "provider_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_994a26636cc20da801d5ef4ee40" UNIQUE ("name", "provider_id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_provider_attributes"(
                    "id",
                    "name",
                    "value",
                    "provider_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "provider_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_ef51081221725c5c073a6045eb"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
                RENAME TO "temporary_auth_identity_providers"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "sub" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64) NOT NULL,
                "protocol_config" varchar(64),
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_providers"(
                    "id",
                    "sub",
                    "name",
                    "protocol",
                    "protocol_config",
                    "enabled",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "sub",
                "name",
                "protocol",
                "protocol_config",
                "enabled",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "temporary_auth_identity_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_providers"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ef51081221725c5c073a6045eb" ON "auth_identity_providers" ("sub", "realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_fadb9ce4df580cc42e78b74b2f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_42df2e30eee05e54c74bced78b"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_96a230c697b83505e073713507"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_ef51081221725c5c073a6045eb"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_providers"
        `);
    }
}
