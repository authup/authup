import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1722673916392 implements MigrationInterface {
    name = 'Default1722673916392';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "description" text,
                "target" varchar(16),
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                "client_id" varchar,
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_permissions"(
                    "id",
                    "name",
                    "built_in",
                    "description",
                    "target",
                    "realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id",
                    "client_id"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at",
                "policy_id",
                "client_id"
            FROM "auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_permissions"
                RENAME TO "auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_b1797e07106b4af61280b8edac"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2d54113aa2edfc3955abcf524a"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13d8b49e55a8b06bee6bbc828f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_users" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "name_locked" boolean NOT NULL DEFAULT (1),
                "first_name" varchar(128),
                "last_name" varchar(128),
                "display_name" varchar(128) NOT NULL,
                "email" varchar(256),
                "password" varchar(512),
                "avatar" varchar(255),
                "cover" varchar(255),
                "reset_hash" varchar(256),
                "reset_at" varchar(28),
                "reset_expires" varchar(28),
                "status" varchar(256),
                "status_message" varchar(256),
                "active" boolean NOT NULL DEFAULT (1),
                "activate_hash" varchar(256),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                "client_id" varchar,
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_b1797e07106b4af61280b8edac1" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_1d5fcbfcbba74381ca8a58a3f17" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_users"(
                    "id",
                    "name",
                    "name_locked",
                    "first_name",
                    "last_name",
                    "display_name",
                    "email",
                    "password",
                    "avatar",
                    "cover",
                    "reset_hash",
                    "reset_at",
                    "reset_expires",
                    "status",
                    "status_message",
                    "active",
                    "activate_hash",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "client_id"
                )
            SELECT "id",
                "name",
                "name_locked",
                "first_name",
                "last_name",
                "display_name",
                "email",
                "password",
                "avatar",
                "cover",
                "reset_hash",
                "reset_at",
                "reset_expires",
                "status",
                "status_message",
                "active",
                "activate_hash",
                "created_at",
                "updated_at",
                "realm_id",
                "client_id"
            FROM "auth_users"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_users"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_users"
                RENAME TO "auth_users"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b1797e07106b4af61280b8edac" ON "auth_users" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_13d8b49e55a8b06bee6bbc828f" ON "auth_users" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1" ON "auth_users" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_realms" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "built_in" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "display_name" varchar(256),
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
                "built_in",
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
            DROP INDEX "IDX_063e4bd5b708c304b51b7ee774"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(64) NOT NULL,
                "target" varchar(16),
                "description" text,
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_063e4bd5b708c304b51b7ee7743" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_roles"(
                    "id",
                    "name",
                    "target",
                    "description",
                    "realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at"
            FROM "auth_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_roles"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_roles"
                RENAME TO "auth_roles"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_policies" (
                "id" varchar PRIMARY KEY NOT NULL,
                "type" varchar(64) NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "invert" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "parentId" varchar,
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_707089f1df498d1719972e69aef" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_43caa964bb178ee4b5a5da7b8a7" FOREIGN KEY ("parentId") REFERENCES "auth_policies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_policies"(
                    "id",
                    "type",
                    "name",
                    "description",
                    "invert",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "parentId"
                )
            SELECT "id",
                "type",
                "name",
                "description",
                "invert",
                "created_at",
                "updated_at",
                "realm_id",
                "parentId"
            FROM "auth_policies"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policies"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_policies"
                RENAME TO "auth_policies"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "description" text,
                "target" varchar(16),
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                "client_id" varchar,
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_permissions"(
                    "id",
                    "name",
                    "built_in",
                    "description",
                    "target",
                    "realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id",
                    "client_id"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at",
                "policy_id",
                "client_id"
            FROM "auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_permissions"
                RENAME TO "auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_91942a5962da3b91175eeaa2db"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9c99802f3f360718344180c3f6"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_robots" (
                "id" varchar PRIMARY KEY NOT NULL,
                "secret" varchar(256) NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "active" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar,
                "realm_id" varchar NOT NULL,
                "client_id" varchar,
                "display_name" varchar(256),
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_91942a5962da3b91175eeaa2db1" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b6d73e3026e15c0af6c41ef8139" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9c99802f3f360718344180c3f68" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_robots"(
                    "id",
                    "secret",
                    "name",
                    "description",
                    "active",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "realm_id",
                    "client_id"
                )
            SELECT "id",
                "secret",
                "name",
                "description",
                "active",
                "created_at",
                "updated_at",
                "user_id",
                "realm_id",
                "client_id"
            FROM "auth_robots"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robots"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_robots"
                RENAME TO "auth_robots"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_91942a5962da3b91175eeaa2db" ON "auth_robots" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
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
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
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
                "display_name" varchar(256),
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
                "display_name" varchar(256),
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
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_realms" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "built_in" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "display_name" varchar(256),
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
                    "updated_at",
                    "display_name"
                )
            SELECT "id",
                "name",
                "description",
                "built_in",
                "created_at",
                "updated_at",
                "display_name"
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
            DROP INDEX "IDX_b1797e07106b4af61280b8edac"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2d54113aa2edfc3955abcf524a"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13d8b49e55a8b06bee6bbc828f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_users" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "name_locked" boolean NOT NULL DEFAULT (1),
                "first_name" varchar(128),
                "last_name" varchar(128),
                "display_name" varchar(256),
                "email" varchar(256),
                "password" varchar(512),
                "avatar" varchar(255),
                "cover" varchar(255),
                "reset_hash" varchar(256),
                "reset_at" varchar(28),
                "reset_expires" varchar(28),
                "status" varchar(256),
                "status_message" varchar(256),
                "active" boolean NOT NULL DEFAULT (1),
                "activate_hash" varchar(256),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                "client_id" varchar,
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_b1797e07106b4af61280b8edac1" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_1d5fcbfcbba74381ca8a58a3f17" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_users"(
                    "id",
                    "name",
                    "name_locked",
                    "first_name",
                    "last_name",
                    "display_name",
                    "email",
                    "password",
                    "avatar",
                    "cover",
                    "reset_hash",
                    "reset_at",
                    "reset_expires",
                    "status",
                    "status_message",
                    "active",
                    "activate_hash",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "client_id"
                )
            SELECT "id",
                "name",
                "name_locked",
                "first_name",
                "last_name",
                "display_name",
                "email",
                "password",
                "avatar",
                "cover",
                "reset_hash",
                "reset_at",
                "reset_expires",
                "status",
                "status_message",
                "active",
                "activate_hash",
                "created_at",
                "updated_at",
                "realm_id",
                "client_id"
            FROM "auth_users"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_users"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_users"
                RENAME TO "auth_users"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b1797e07106b4af61280b8edac" ON "auth_users" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_13d8b49e55a8b06bee6bbc828f" ON "auth_users" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1" ON "auth_users" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "description" text,
                "target" varchar(16),
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                "client_id" varchar,
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_permissions"(
                    "id",
                    "name",
                    "built_in",
                    "description",
                    "target",
                    "realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id",
                    "client_id",
                    "display_name"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at",
                "policy_id",
                "client_id",
                "display_name"
            FROM "auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_permissions"
                RENAME TO "auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "description" text,
                "target" varchar(16),
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                "client_id" varchar,
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_permissions"(
                    "id",
                    "name",
                    "built_in",
                    "description",
                    "target",
                    "realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id",
                    "client_id",
                    "display_name"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at",
                "policy_id",
                "client_id",
                "display_name"
            FROM "auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_permissions"
                RENAME TO "auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
                RENAME TO "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "description" text,
                "target" varchar(16),
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                "client_id" varchar,
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_permissions"(
                    "id",
                    "name",
                    "built_in",
                    "description",
                    "target",
                    "realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id",
                    "client_id",
                    "display_name"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at",
                "policy_id",
                "client_id",
                "display_name"
            FROM "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
                RENAME TO "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "description" text,
                "target" varchar(16),
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                "client_id" varchar,
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_permissions"(
                    "id",
                    "name",
                    "built_in",
                    "description",
                    "target",
                    "realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id",
                    "client_id",
                    "display_name"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at",
                "policy_id",
                "client_id",
                "display_name"
            FROM "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13d8b49e55a8b06bee6bbc828f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2d54113aa2edfc3955abcf524a"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_b1797e07106b4af61280b8edac"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
                RENAME TO "temporary_auth_users"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_users" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "name_locked" boolean NOT NULL DEFAULT (1),
                "first_name" varchar(128),
                "last_name" varchar(128),
                "display_name" varchar(128) NOT NULL,
                "email" varchar(256),
                "password" varchar(512),
                "avatar" varchar(255),
                "cover" varchar(255),
                "reset_hash" varchar(256),
                "reset_at" varchar(28),
                "reset_expires" varchar(28),
                "status" varchar(256),
                "status_message" varchar(256),
                "active" boolean NOT NULL DEFAULT (1),
                "activate_hash" varchar(256),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                "client_id" varchar,
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_b1797e07106b4af61280b8edac1" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_1d5fcbfcbba74381ca8a58a3f17" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_users"(
                    "id",
                    "name",
                    "name_locked",
                    "first_name",
                    "last_name",
                    "display_name",
                    "email",
                    "password",
                    "avatar",
                    "cover",
                    "reset_hash",
                    "reset_at",
                    "reset_expires",
                    "status",
                    "status_message",
                    "active",
                    "activate_hash",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "client_id"
                )
            SELECT "id",
                "name",
                "name_locked",
                "first_name",
                "last_name",
                "display_name",
                "email",
                "password",
                "avatar",
                "cover",
                "reset_hash",
                "reset_at",
                "reset_expires",
                "status",
                "status_message",
                "active",
                "activate_hash",
                "created_at",
                "updated_at",
                "realm_id",
                "client_id"
            FROM "temporary_auth_users"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_users"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1" ON "auth_users" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_13d8b49e55a8b06bee6bbc828f" ON "auth_users" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b1797e07106b4af61280b8edac" ON "auth_users" ("client_id")
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
                "built_in" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "display_name" varchar(256),
                CONSTRAINT "UQ_9b95dc8c08d8b11a80a6798a640" UNIQUE ("name")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_realms"(
                    "id",
                    "name",
                    "description",
                    "built_in",
                    "created_at",
                    "updated_at",
                    "display_name"
                )
            SELECT "id",
                "name",
                "description",
                "built_in",
                "created_at",
                "updated_at",
                "display_name"
            FROM "temporary_auth_realms"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_realms"
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
                CONSTRAINT "UQ_b14fab23784a81c282abef41fae" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_69e83c8e7e11a247a0809eb3327" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            DROP INDEX "IDX_9c99802f3f360718344180c3f6"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_91942a5962da3b91175eeaa2db"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robots"
                RENAME TO "temporary_auth_robots"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_robots" (
                "id" varchar PRIMARY KEY NOT NULL,
                "secret" varchar(256) NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "active" boolean NOT NULL DEFAULT (1),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar,
                "realm_id" varchar NOT NULL,
                "client_id" varchar,
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_91942a5962da3b91175eeaa2db1" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b6d73e3026e15c0af6c41ef8139" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9c99802f3f360718344180c3f68" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_robots"(
                    "id",
                    "secret",
                    "name",
                    "description",
                    "active",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "realm_id",
                    "client_id"
                )
            SELECT "id",
                "secret",
                "name",
                "description",
                "active",
                "created_at",
                "updated_at",
                "user_id",
                "realm_id",
                "client_id"
            FROM "temporary_auth_robots"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_robots"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_91942a5962da3b91175eeaa2db" ON "auth_robots" ("client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
                RENAME TO "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "description" text,
                "target" varchar(16),
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                "client_id" varchar,
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_permissions"(
                    "id",
                    "name",
                    "built_in",
                    "description",
                    "target",
                    "realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id",
                    "client_id"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at",
                "policy_id",
                "client_id"
            FROM "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies"
                RENAME TO "temporary_auth_policies"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_policies" (
                "id" varchar PRIMARY KEY NOT NULL,
                "type" varchar(64) NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "invert" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "parentId" varchar,
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_707089f1df498d1719972e69aef" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_43caa964bb178ee4b5a5da7b8a7" FOREIGN KEY ("parentId") REFERENCES "auth_policies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_policies"(
                    "id",
                    "type",
                    "name",
                    "description",
                    "invert",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "parentId"
                )
            SELECT "id",
                "type",
                "name",
                "description",
                "invert",
                "created_at",
                "updated_at",
                "realm_id",
                "parentId"
            FROM "temporary_auth_policies"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_policies"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_063e4bd5b708c304b51b7ee774"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
                RENAME TO "temporary_auth_roles"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(64) NOT NULL,
                "target" varchar(16),
                "description" text,
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_063e4bd5b708c304b51b7ee7743" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_roles"(
                    "id",
                    "name",
                    "target",
                    "description",
                    "realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_roles"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
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
                "built_in" boolean NOT NULL DEFAULT (1),
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
                    "built_in",
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
        await queryRunner.query(`
            DROP INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13d8b49e55a8b06bee6bbc828f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2d54113aa2edfc3955abcf524a"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_b1797e07106b4af61280b8edac"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
                RENAME TO "temporary_auth_users"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_users" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "name_locked" boolean NOT NULL DEFAULT (1),
                "first_name" varchar(128),
                "last_name" varchar(128),
                "display_name" varchar(128) NOT NULL,
                "email" varchar(256),
                "password" varchar(512),
                "avatar" varchar(255),
                "cover" varchar(255),
                "reset_hash" varchar(256),
                "reset_at" varchar(28),
                "reset_expires" varchar(28),
                "status" varchar(256),
                "status_message" varchar(256),
                "active" boolean NOT NULL DEFAULT (1),
                "activate_hash" varchar(256),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                "client_id" varchar,
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_b1797e07106b4af61280b8edac1" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_1d5fcbfcbba74381ca8a58a3f17" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_users"(
                    "id",
                    "name",
                    "name_locked",
                    "first_name",
                    "last_name",
                    "display_name",
                    "email",
                    "password",
                    "avatar",
                    "cover",
                    "reset_hash",
                    "reset_at",
                    "reset_expires",
                    "status",
                    "status_message",
                    "active",
                    "activate_hash",
                    "created_at",
                    "updated_at",
                    "realm_id",
                    "client_id"
                )
            SELECT "id",
                "name",
                "name_locked",
                "first_name",
                "last_name",
                "display_name",
                "email",
                "password",
                "avatar",
                "cover",
                "reset_hash",
                "reset_at",
                "reset_expires",
                "status",
                "status_message",
                "active",
                "activate_hash",
                "created_at",
                "updated_at",
                "realm_id",
                "client_id"
            FROM "temporary_auth_users"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_users"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1" ON "auth_users" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_13d8b49e55a8b06bee6bbc828f" ON "auth_users" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b1797e07106b4af61280b8edac" ON "auth_users" ("client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
                RENAME TO "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT (0),
                "description" text,
                "target" varchar(16),
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                "client_id" varchar,
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name", "realm_id"),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_permissions"(
                    "id",
                    "name",
                    "built_in",
                    "description",
                    "target",
                    "realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id",
                    "client_id"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at",
                "policy_id",
                "client_id"
            FROM "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
    }
}
