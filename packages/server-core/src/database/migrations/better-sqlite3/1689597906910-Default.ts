import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1689597906910 implements MigrationInterface {
    name = 'Default1689597906910';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_realms" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "built_in" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_9b95dc8c08d8b11a80a6798a640" UNIQUE ("name")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_realms"(
                    "id",
                    "name",
                    "description",
                    "built_in",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "description",
                "drop_able",
                "created_at",
                "updated_at"
            FROM "auth_realms"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_realms"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_realms"
                RENAME TO "auth_realms"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "slug" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id"),
                CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_providers"(
                    "id",
                    "slug",
                    "name",
                    "protocol",
                    "enabled",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "slug",
                "name",
                "protocol",
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
            CREATE TABLE "temporary_auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "slug" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                "preset" varchar(64),
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id"),
                CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_providers"(
                    "id",
                    "slug",
                    "name",
                    "protocol",
                    "enabled",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "slug",
                "name",
                "protocol",
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
            CREATE TABLE "temporary_auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "slug" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64),
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                "preset" varchar(64),
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id"),
                CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_providers"(
                    "id",
                    "slug",
                    "name",
                    "protocol",
                    "enabled",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "preset"
                )
            SELECT "id",
                "slug",
                "name",
                "protocol",
                "enabled",
                "created_at",
                "updated_at",
                "realm_id",
                "preset"
            FROM "auth_identity_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_providers"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_identity_providers"
                RENAME TO "auth_identity_providers"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
                RENAME TO "temporary_auth_identity_providers"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "slug" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                "preset" varchar(64),
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id"),
                CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_providers"(
                    "id",
                    "slug",
                    "name",
                    "protocol",
                    "enabled",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "preset"
                )
            SELECT "id",
                "slug",
                "name",
                "protocol",
                "enabled",
                "created_at",
                "updated_at",
                "realm_id",
                "preset"
            FROM "temporary_auth_identity_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_providers"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
                RENAME TO "temporary_auth_identity_providers"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "slug" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id"),
                CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_providers"(
                    "id",
                    "slug",
                    "name",
                    "protocol",
                    "enabled",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "slug",
                "name",
                "protocol",
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
            ALTER TABLE "auth_identity_providers"
                RENAME TO "temporary_auth_identity_providers"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "slug" varchar(36) NOT NULL,
                "name" varchar(128) NOT NULL,
                "protocol" varchar(64) NOT NULL,
                "protocol_config" varchar(64),
                "enabled" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id"),
                CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_providers"(
                    "id",
                    "slug",
                    "name",
                    "protocol",
                    "enabled",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "slug",
                "name",
                "protocol",
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
            ALTER TABLE "auth_realms"
                RENAME TO "temporary_auth_realms"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_realms" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "drop_able" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_9b95dc8c08d8b11a80a6798a640" UNIQUE ("name")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_realms"(
                    "id",
                    "name",
                    "description",
                    "drop_able",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "description",
                "built_in",
                "created_at",
                "updated_at"
            FROM "temporary_auth_realms"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_realms"
        `);
    }
}
