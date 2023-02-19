import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1673449341125 implements MigrationInterface {
    name = 'Default1673449341125';

    public async up(queryRunner: QueryRunner): Promise<void> {
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
            CREATE TABLE "auth_keys" (
                "id" varchar PRIMARY KEY NOT NULL,
                "type" varchar(64),
                "priority" integer NOT NULL DEFAULT (0),
                "signature_algorithm" varchar(64),
                "decryption_key" varchar(4096),
                "encryption_key" varchar(4096),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fdc78f76d9316352bddfed9165" ON "auth_keys" ("type")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5921107054192639a79fb274b9" ON "auth_keys" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e38d9d6e8be3d1d6e684b60342" ON "auth_keys" ("priority", "realm_id", "type")
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
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id")
            )
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
            CREATE TABLE "auth_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(64) NOT NULL,
                "target" varchar(16),
                "description" text,
                "realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b" UNIQUE ("name", "realm_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
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
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_40c0ee0929b20575df125e8d14" ON "auth_role_permissions" ("permission_id", "role_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1aaaa657b3c0615f6b4a6e657" ON "auth_user_roles" ("role_id", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1a21fc2e6ac12fa29b02c4382" ON "auth_user_permissions" ("permission_id", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar NOT NULL,
                "user_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_b748c46e233d86287b63b49d09f" UNIQUE ("name", "user_id")
            )
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
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_robot_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "client_id" varchar
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_515b3dc84ba9bec42bd0e92cbd" ON "auth_robot_roles" ("role_id", "robot_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_robot_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_0c2284272043ed8aba6689306b" ON "auth_robot_permissions" ("permission_id", "robot_id")
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
                CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_authorization_codes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" varchar(28) NOT NULL,
                "scope" varchar(512),
                "redirect_uri" varchar(2000),
                "id_token" varchar(1000),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL
            )
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
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
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
                "expires_at" varchar(28),
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
            CREATE TABLE "auth_refresh_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "expires" varchar(28) NOT NULL,
                "scope" varchar(512),
                "access_token" varchar,
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar,
                "role_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_aabe997ae70f617cb5479ed8d87" UNIQUE ("name", "role_id")
            )
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_fdc78f76d9316352bddfed9165"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_5921107054192639a79fb274b9"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_e38d9d6e8be3d1d6e684b60342"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_keys" (
                "id" varchar PRIMARY KEY NOT NULL,
                "type" varchar(64),
                "priority" integer NOT NULL DEFAULT (0),
                "signature_algorithm" varchar(64),
                "decryption_key" varchar(4096),
                "encryption_key" varchar(4096),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                CONSTRAINT "FK_5921107054192639a79fb274b91" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_keys"(
                    "id",
                    "type",
                    "priority",
                    "signature_algorithm",
                    "decryption_key",
                    "encryption_key",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "type",
                "priority",
                "signature_algorithm",
                "decryption_key",
                "encryption_key",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "auth_keys"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_keys"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_keys"
                RENAME TO "auth_keys"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fdc78f76d9316352bddfed9165" ON "auth_keys" ("type")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5921107054192639a79fb274b9" ON "auth_keys" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e38d9d6e8be3d1d6e684b60342" ON "auth_keys" ("priority", "realm_id", "type")
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
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id"),
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
                    "realm_id"
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
                "realm_id"
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
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_13d8b49e55a8b06bee6bbc828f" ON "auth_users" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1" ON "auth_users" ("realm_id")
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
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
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
                    "updated_at"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at"
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
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_40c0ee0929b20575df125e8d14"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_role_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f9ab8919ff5d5993816f6881879" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_role_permissions"(
                    "id",
                    "power",
                    "condition",
                    "fields",
                    "negation",
                    "target",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
                "power",
                "condition",
                "fields",
                "negation",
                "target",
                "created_at",
                "updated_at",
                "role_id",
                "role_realm_id",
                "permission_id",
                "permission_realm_id"
            FROM "auth_role_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_role_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_role_permissions"
                RENAME TO "auth_role_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_40c0ee0929b20575df125e8d14" ON "auth_role_permissions" ("permission_id", "role_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_e1aaaa657b3c0615f6b4a6e657"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_user_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_866cd5c92b05353aab240bdc10a" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_77fe9d38c984c640fc155503c4f" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_a3a59104c9c9f2a2458972bc96d" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6161ccebf3af1c475758651de49" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_user_roles"(
                    "id",
                    "role_id",
                    "role_realm_id",
                    "user_id",
                    "user_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "role_id",
                "role_realm_id",
                "user_id",
                "user_realm_id",
                "created_at",
                "updated_at"
            FROM "auth_user_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_roles"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_user_roles"
                RENAME TO "auth_user_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1aaaa657b3c0615f6b4a6e657" ON "auth_user_roles" ("role_id", "user_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_e1a21fc2e6ac12fa29b02c4382"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_user_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_e2de70574303693fea386cc0edd" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_user_permissions"(
                    "id",
                    "power",
                    "condition",
                    "fields",
                    "negation",
                    "target",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "user_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
                "power",
                "condition",
                "fields",
                "negation",
                "target",
                "created_at",
                "updated_at",
                "user_id",
                "user_realm_id",
                "permission_id",
                "permission_realm_id"
            FROM "auth_user_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_user_permissions"
                RENAME TO "auth_user_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1a21fc2e6ac12fa29b02c4382" ON "auth_user_permissions" ("permission_id", "user_id")
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
                CONSTRAINT "FK_9a84db5a27d34b31644b54d9106" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f50fe4004312e972a547c0e945e" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
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
                    "realm_id"
                )
            SELECT "id",
                "secret",
                "name",
                "description",
                "active",
                "created_at",
                "updated_at",
                "user_id",
                "realm_id"
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
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_515b3dc84ba9bec42bd0e92cbd"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_robot_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "client_id" varchar,
                CONSTRAINT "FK_2256b04cbdb1e16e5144e14750b" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_28146c7babddcad18116dabfa9e" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_a4904e9c921294c80f75a0c3e02" FOREIGN KEY ("client_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_21994ec834c710276cce38c779d" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_robot_roles"(
                    "id",
                    "role_id",
                    "role_realm_id",
                    "robot_id",
                    "robot_realm_id",
                    "created_at",
                    "updated_at",
                    "client_id"
                )
            SELECT "id",
                "role_id",
                "role_realm_id",
                "robot_id",
                "robot_realm_id",
                "created_at",
                "updated_at",
                "client_id"
            FROM "auth_robot_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robot_roles"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_robot_roles"
                RENAME TO "auth_robot_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_515b3dc84ba9bec42bd0e92cbd" ON "auth_robot_roles" ("role_id", "robot_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0c2284272043ed8aba6689306b"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_robot_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_robot_permissions"(
                    "id",
                    "power",
                    "condition",
                    "fields",
                    "negation",
                    "target",
                    "robot_id",
                    "robot_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "power",
                "condition",
                "fields",
                "negation",
                "target",
                "robot_id",
                "robot_realm_id",
                "permission_id",
                "permission_realm_id",
                "created_at",
                "updated_at"
            FROM "auth_robot_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robot_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_robot_permissions"
                RENAME TO "auth_robot_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_0c2284272043ed8aba6689306b" ON "auth_robot_permissions" ("permission_id", "robot_id")
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
                CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            CREATE TABLE "temporary_auth_authorization_codes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" varchar(28) NOT NULL,
                "scope" varchar(512),
                "redirect_uri" varchar(2000),
                "id_token" varchar(1000),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_ff6e597e9dd296da510efc06d28" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5119ffb8f6b8ba853e52be2e417" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_32619f36922f433e27affc169e4" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_343b25488aef1b87f4771f8c7eb" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_authorization_codes"(
                    "id",
                    "content",
                    "expires",
                    "scope",
                    "redirect_uri",
                    "id_token",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "realm_id"
                )
            SELECT "id",
                "content",
                "expires",
                "scope",
                "redirect_uri",
                "id_token",
                "client_id",
                "user_id",
                "robot_id",
                "realm_id"
            FROM "auth_authorization_codes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_authorization_codes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_authorization_codes"
                RENAME TO "auth_authorization_codes"
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
                "expires_at" varchar(28),
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
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_refresh_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "expires" varchar(28) NOT NULL,
                "scope" varchar(512),
                "access_token" varchar,
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f795ad14f31838e3ddc663ee150" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_refresh_tokens"(
                    "id",
                    "expires",
                    "scope",
                    "access_token",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "realm_id"
                )
            SELECT "id",
                "expires",
                "scope",
                "access_token",
                "client_id",
                "user_id",
                "robot_id",
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
                "value" text,
                "realm_id" varchar,
                "role_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_aabe997ae70f617cb5479ed8d87" UNIQUE ("name", "role_id"),
                CONSTRAINT "FK_2ba00548c512fffe2e5bf4bb3ff" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cd014be6be330f64b8405d0c72a" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_role_attributes"
                RENAME TO "temporary_auth_role_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar,
                "role_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_aabe997ae70f617cb5479ed8d87" UNIQUE ("name", "role_id")
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
                "expires" varchar(28) NOT NULL,
                "scope" varchar(512),
                "access_token" varchar,
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_refresh_tokens"(
                    "id",
                    "expires",
                    "scope",
                    "access_token",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "realm_id"
                )
            SELECT "id",
                "expires",
                "scope",
                "access_token",
                "client_id",
                "user_id",
                "robot_id",
                "realm_id"
            FROM "temporary_auth_refresh_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_refresh_tokens"
        `);
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
                "expires_at" varchar(28),
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
                "value" text,
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
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_providers"(
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
            ALTER TABLE "auth_authorization_codes"
                RENAME TO "temporary_auth_authorization_codes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_authorization_codes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" varchar(28) NOT NULL,
                "scope" varchar(512),
                "redirect_uri" varchar(2000),
                "id_token" varchar(1000),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_authorization_codes"(
                    "id",
                    "content",
                    "expires",
                    "scope",
                    "redirect_uri",
                    "id_token",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "realm_id"
                )
            SELECT "id",
                "content",
                "expires",
                "scope",
                "redirect_uri",
                "id_token",
                "client_id",
                "user_id",
                "robot_id",
                "realm_id"
            FROM "temporary_auth_authorization_codes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_authorization_codes"
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
                CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id")
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
            DROP INDEX "IDX_0c2284272043ed8aba6689306b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
                RENAME TO "temporary_auth_robot_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_robot_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_robot_permissions"(
                    "id",
                    "power",
                    "condition",
                    "fields",
                    "negation",
                    "target",
                    "robot_id",
                    "robot_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "power",
                "condition",
                "fields",
                "negation",
                "target",
                "robot_id",
                "robot_realm_id",
                "permission_id",
                "permission_realm_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_robot_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_robot_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_0c2284272043ed8aba6689306b" ON "auth_robot_permissions" ("permission_id", "robot_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_515b3dc84ba9bec42bd0e92cbd"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles"
                RENAME TO "temporary_auth_robot_roles"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_robot_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "client_id" varchar
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_robot_roles"(
                    "id",
                    "role_id",
                    "role_realm_id",
                    "robot_id",
                    "robot_realm_id",
                    "created_at",
                    "updated_at",
                    "client_id"
                )
            SELECT "id",
                "role_id",
                "role_realm_id",
                "robot_id",
                "robot_realm_id",
                "created_at",
                "updated_at",
                "client_id"
            FROM "temporary_auth_robot_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_robot_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_515b3dc84ba9bec42bd0e92cbd" ON "auth_robot_roles" ("role_id", "robot_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9c99802f3f360718344180c3f6"
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
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id")
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
                    "realm_id"
                )
            SELECT "id",
                "secret",
                "name",
                "description",
                "active",
                "created_at",
                "updated_at",
                "user_id",
                "realm_id"
            FROM "temporary_auth_robots"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_robots"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_attributes"
                RENAME TO "temporary_auth_user_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar NOT NULL,
                "user_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_b748c46e233d86287b63b49d09f" UNIQUE ("name", "user_id")
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
            DROP INDEX "IDX_e1a21fc2e6ac12fa29b02c4382"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
                RENAME TO "temporary_auth_user_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_user_permissions"(
                    "id",
                    "power",
                    "condition",
                    "fields",
                    "negation",
                    "target",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "user_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
                "power",
                "condition",
                "fields",
                "negation",
                "target",
                "created_at",
                "updated_at",
                "user_id",
                "user_realm_id",
                "permission_id",
                "permission_realm_id"
            FROM "temporary_auth_user_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_user_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1a21fc2e6ac12fa29b02c4382" ON "auth_user_permissions" ("permission_id", "user_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_e1aaaa657b3c0615f6b4a6e657"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles"
                RENAME TO "temporary_auth_user_roles"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_user_roles"(
                    "id",
                    "role_id",
                    "role_realm_id",
                    "user_id",
                    "user_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "role_id",
                "role_realm_id",
                "user_id",
                "user_realm_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_user_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_user_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1aaaa657b3c0615f6b4a6e657" ON "auth_user_roles" ("role_id", "user_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_40c0ee0929b20575df125e8d14"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
                RENAME TO "temporary_auth_role_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "power" integer NOT NULL DEFAULT (999),
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT (0),
                "target" varchar(16),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_role_permissions"(
                    "id",
                    "power",
                    "condition",
                    "fields",
                    "negation",
                    "target",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
                "power",
                "condition",
                "fields",
                "negation",
                "target",
                "created_at",
                "updated_at",
                "role_id",
                "role_realm_id",
                "permission_id",
                "permission_realm_id"
            FROM "temporary_auth_role_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_role_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_40c0ee0929b20575df125e8d14" ON "auth_role_permissions" ("permission_id", "role_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
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
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name")
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
                    "updated_at"
                )
            SELECT "id",
                "name",
                "built_in",
                "description",
                "target",
                "realm_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_permissions"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
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
                CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b" UNIQUE ("name", "realm_id")
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
            DROP INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13d8b49e55a8b06bee6bbc828f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2d54113aa2edfc3955abcf524a"
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
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id")
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
                    "realm_id"
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
                "realm_id"
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
            DROP INDEX "IDX_e38d9d6e8be3d1d6e684b60342"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_5921107054192639a79fb274b9"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_fdc78f76d9316352bddfed9165"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys"
                RENAME TO "temporary_auth_keys"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_keys" (
                "id" varchar PRIMARY KEY NOT NULL,
                "type" varchar(64),
                "priority" integer NOT NULL DEFAULT (0),
                "signature_algorithm" varchar(64),
                "decryption_key" varchar(4096),
                "encryption_key" varchar(4096),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_keys"(
                    "id",
                    "type",
                    "priority",
                    "signature_algorithm",
                    "decryption_key",
                    "encryption_key",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "type",
                "priority",
                "signature_algorithm",
                "decryption_key",
                "encryption_key",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "temporary_auth_keys"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_keys"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e38d9d6e8be3d1d6e684b60342" ON "auth_keys" ("priority", "realm_id", "type")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5921107054192639a79fb274b9" ON "auth_keys" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fdc78f76d9316352bddfed9165" ON "auth_keys" ("type")
        `);
        await queryRunner.query(`
            DROP TABLE "auth_role_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_refresh_tokens"
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
            DROP TABLE "auth_identity_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_authorization_codes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_clients"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0c2284272043ed8aba6689306b"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robot_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_515b3dc84ba9bec42bd0e92cbd"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robot_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9c99802f3f360718344180c3f6"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robots"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_attributes"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_e1a21fc2e6ac12fa29b02c4382"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_e1aaaa657b3c0615f6b4a6e657"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_40c0ee0929b20575df125e8d14"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_role_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_063e4bd5b708c304b51b7ee774"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_roles"
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
            DROP TABLE "auth_users"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_e38d9d6e8be3d1d6e684b60342"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_5921107054192639a79fb274b9"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_fdc78f76d9316352bddfed9165"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_keys"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_realms"
        `);
    }
}
