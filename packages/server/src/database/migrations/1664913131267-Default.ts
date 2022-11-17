import { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1664913131267 implements MigrationInterface {
    name = 'Default1664913131267';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_refresh_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "access_token_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f795ad14f31838e3ddc663ee150" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_refresh_tokens"(
                    "id",
                    "expires",
                    "scope",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "access_token_id",
                    "realm_id"
                )
            SELECT "id",
                "expires",
                "scope",
                "client_id",
                "user_id",
                "robot_id",
                "access_token_id",
                "realm_id"
            FROM "auth_refresh_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_refresh_tokens"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_refresh_tokens"
                RENAME TO "auth_refresh_tokens"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2d54113aa2edfc3955abcf524a"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_6e74f330e34555ae90068b0392"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_ef51081221725c5c073a6045eb"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_user_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "realm_id" varchar NOT NULL,
                "user_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_b748c46e233d86287b63b49d09f" UNIQUE ("name", "user_id"),
                CONSTRAINT "FK_f50fe4004312e972a547c0e945e" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9a84db5a27d34b31644b54d9106" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_user_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "user_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "user_id",
                "created_at",
                "updated_at"
            FROM "auth_user_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_attributes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_user_attributes"
                RENAME TO "auth_user_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "slug" varchar(36) NOT NULL,
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
                    "slug",
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
            CREATE TABLE "temporary_auth_refresh_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "access_token" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f795ad14f31838e3ddc663ee150" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_refresh_tokens"(
                    "id",
                    "expires",
                    "scope",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "access_token",
                    "realm_id"
                )
            SELECT "id",
                "expires",
                "scope",
                "client_id",
                "user_id",
                "robot_id",
                "access_token_id",
                "realm_id"
            FROM "auth_refresh_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_refresh_tokens"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_refresh_tokens"
                RENAME TO "auth_refresh_tokens"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_role_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "realm_id" varchar,
                "role_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_aabe997ae70f617cb5479ed8d87" UNIQUE ("name", "role_id"),
                CONSTRAINT "FK_cd014be6be330f64b8405d0c72a" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2ba00548c512fffe2e5bf4bb3ff" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_role_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "role_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "role_id",
                "created_at",
                "updated_at"
            FROM "auth_role_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_role_attributes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_role_attributes"
                RENAME TO "auth_role_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_user_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar NOT NULL,
                "user_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_b748c46e233d86287b63b49d09f" UNIQUE ("name", "user_id"),
                CONSTRAINT "FK_f50fe4004312e972a547c0e945e" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9a84db5a27d34b31644b54d9106" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_user_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "user_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "user_id",
                "created_at",
                "updated_at"
            FROM "auth_user_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_attributes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_user_attributes"
                RENAME TO "auth_user_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_provider_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
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
            CREATE TABLE "temporary_auth_role_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar,
                "role_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_aabe997ae70f617cb5479ed8d87" UNIQUE ("name", "role_id"),
                CONSTRAINT "FK_cd014be6be330f64b8405d0c72a" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2ba00548c512fffe2e5bf4bb3ff" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_role_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "role_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "role_id",
                "created_at",
                "updated_at"
            FROM "auth_role_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_role_attributes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_role_attributes"
                RENAME TO "auth_role_attributes"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_3752f24587d0405c13f5a790da" ON "auth_identity_providers" ("slug", "realm_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_3752f24587d0405c13f5a790da"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_attributes"
                RENAME TO "temporary_auth_role_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "realm_id" varchar,
                "role_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_aabe997ae70f617cb5479ed8d87" UNIQUE ("name", "role_id"),
                CONSTRAINT "FK_cd014be6be330f64b8405d0c72a" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2ba00548c512fffe2e5bf4bb3ff" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_role_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "role_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "role_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_role_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_role_attributes"
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
                CONSTRAINT "UQ_994a26636cc20da801d5ef4ee40" UNIQUE ("name", "provider_id"),
                CONSTRAINT "FK_5ac40c5ce92142639df65a33e53" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            ALTER TABLE "auth_user_attributes"
                RENAME TO "temporary_auth_user_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "realm_id" varchar NOT NULL,
                "user_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_b748c46e233d86287b63b49d09f" UNIQUE ("name", "user_id"),
                CONSTRAINT "FK_f50fe4004312e972a547c0e945e" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9a84db5a27d34b31644b54d9106" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_user_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "user_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "user_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_user_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_user_attributes"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_attributes"
                RENAME TO "temporary_auth_role_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "realm_id" varchar,
                "role_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_aabe997ae70f617cb5479ed8d87" UNIQUE ("name", "role_id"),
                CONSTRAINT "FK_cd014be6be330f64b8405d0c72a" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2ba00548c512fffe2e5bf4bb3ff" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_role_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "role_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "role_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_role_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_role_attributes"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens"
                RENAME TO "temporary_auth_refresh_tokens"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_refresh_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "access_token_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f795ad14f31838e3ddc663ee150" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_refresh_tokens"(
                    "id",
                    "expires",
                    "scope",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "access_token_id",
                    "realm_id"
                )
            SELECT "id",
                "expires",
                "scope",
                "client_id",
                "user_id",
                "robot_id",
                "access_token",
                "realm_id"
            FROM "temporary_auth_refresh_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_refresh_tokens"
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
                CONSTRAINT "UQ_994a26636cc20da801d5ef4ee40" UNIQUE ("name", "provider_id"),
                CONSTRAINT "FK_5ac40c5ce92142639df65a33e53" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                "slug",
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
            ALTER TABLE "auth_user_attributes"
                RENAME TO "temporary_auth_user_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "realm_id" varchar NOT NULL,
                "user_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_b748c46e233d86287b63b49d09f" UNIQUE ("name", "user_id"),
                CONSTRAINT "FK_f50fe4004312e972a547c0e945e" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9a84db5a27d34b31644b54d9106" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_user_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "user_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "user_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_user_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_user_attributes"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ef51081221725c5c073a6045eb" ON "auth_identity_providers" ("sub", "realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6e74f330e34555ae90068b0392" ON "auth_roles" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens"
                RENAME TO "temporary_auth_refresh_tokens"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_refresh_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "access_token_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3c95cc8e54e69c3acc2b87bc420" FOREIGN KEY ("access_token_id") REFERENCES "auth_access_tokens" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                    CONSTRAINT "FK_f795ad14f31838e3ddc663ee150" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                    CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_refresh_tokens"(
                    "id",
                    "expires",
                    "scope",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "access_token_id",
                    "realm_id"
                )
            SELECT "id",
                "expires",
                "scope",
                "client_id",
                "user_id",
                "robot_id",
                "access_token_id",
                "realm_id"
            FROM "temporary_auth_refresh_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_refresh_tokens"
        `);
    }
}
