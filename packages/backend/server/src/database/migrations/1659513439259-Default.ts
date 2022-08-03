import { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1659513439259 implements MigrationInterface {
    name = 'Default1659513439259';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_realms" (
                "id" varchar(36) PRIMARY KEY NOT NULL,
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
            CREATE TABLE "auth_user_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
                "realm_id" varchar NOT NULL,
                "user_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_b748c46e233d86287b63b49d09f" UNIQUE ("name", "user_id")
            )
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
                "reset_at" datetime,
                "reset_expires" datetime,
                "status" varchar(256),
                "status_message" varchar(256),
                "active" boolean NOT NULL DEFAULT (1),
                "activate_hash" varchar(256),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                CONSTRAINT "UQ_2d54113aa2edfc3955abcf524aa" UNIQUE ("name")
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
                CONSTRAINT "UQ_6e74f330e34555ae90068b03928" UNIQUE ("name")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6e74f330e34555ae90068b0392" ON "auth_roles" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_permissions" (
                "id" varchar(128) PRIMARY KEY NOT NULL,
                "target" varchar(16),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
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
                "permission_id" varchar NOT NULL
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
                "permission_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1a21fc2e6ac12fa29b02c4382" ON "auth_user_permissions" ("permission_id", "user_id")
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
                "realm_id" varchar NOT NULL DEFAULT ('master')
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_f32b0b8138a40ced608c7cfc3e" ON "auth_robots" ("name")
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
                "redirect_uri" varchar(2000),
                "grant_types" varchar(512),
                "scope" varchar(512),
                "is_confidential" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "user_id" varchar
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_access_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_authorization_codes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" datetime NOT NULL,
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
            CREATE TABLE "auth_oauth2_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(36) NOT NULL,
                "open_id" boolean NOT NULL DEFAULT (0),
                "client_id" varchar(256) NOT NULL,
                "client_secret" varchar(256),
                "token_host" varchar(256),
                "token_path" varchar(128),
                "token_revoke_path" varchar(128),
                "authorize_host" varchar(256),
                "authorize_path" varchar(128),
                "user_info_host" varchar(256),
                "user_info_path" varchar(128),
                "scope" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_4dbdee0f1355d411972939967d" ON "auth_oauth2_providers" ("name", "realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_oauth2_provider_accounts" (
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
            CREATE UNIQUE INDEX "IDX_54525c92a39b98d1b0b03ad708" ON "auth_oauth2_provider_accounts" ("provider_id", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_oauth2_provider_roles" (
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
            CREATE UNIQUE INDEX "IDX_17c48da30a878499a38ac7e47c" ON "auth_oauth2_provider_roles" ("provider_id", "external_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_039f19cbf8eadd18be864fe0c6" ON "auth_oauth2_provider_roles" ("provider_id", "role_id")
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
                "realm_id" varchar NOT NULL
            )
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
            CREATE TABLE "temporary_auth_user_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
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
                "reset_at" datetime,
                "reset_expires" datetime,
                "status" varchar(256),
                "status_message" varchar(256),
                "active" boolean NOT NULL DEFAULT (1),
                "activate_hash" varchar(256),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                CONSTRAINT "UQ_2d54113aa2edfc3955abcf524aa" UNIQUE ("name"),
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
            DROP INDEX "IDX_6e74f330e34555ae90068b0392"
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
                CONSTRAINT "UQ_6e74f330e34555ae90068b03928" UNIQUE ("name"),
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
            CREATE INDEX "IDX_6e74f330e34555ae90068b0392" ON "auth_roles" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
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
                CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                    "permission_id"
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
                "permission_id"
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
                CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                    "permission_id"
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
                "permission_id"
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
            DROP INDEX "IDX_f32b0b8138a40ced608c7cfc3e"
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
                "realm_id" varchar NOT NULL DEFAULT ('master'),
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
            CREATE UNIQUE INDEX "IDX_f32b0b8138a40ced608c7cfc3e" ON "auth_robots" ("name")
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
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                "redirect_uri" varchar(2000),
                "grant_types" varchar(512),
                "scope" varchar(512),
                "is_confidential" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "user_id" varchar,
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
            CREATE TABLE "temporary_auth_access_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_0f843d99462f485cf847db9b8cf" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_83d6c9916b02fe7315afb1bcf66" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c40e2f3450b458e935784904fc6" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_44a975dcfe57d213c19245e77be" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_access_tokens"(
                    "id",
                    "content",
                    "expires",
                    "scope",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "realm_id"
                )
            SELECT "id",
                "content",
                "expires",
                "scope",
                "client_id",
                "user_id",
                "robot_id",
                "realm_id"
            FROM "auth_access_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_access_tokens"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_access_tokens"
                RENAME TO "auth_access_tokens"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_authorization_codes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" datetime NOT NULL,
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
            DROP INDEX "IDX_4dbdee0f1355d411972939967d"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_oauth2_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(36) NOT NULL,
                "open_id" boolean NOT NULL DEFAULT (0),
                "client_id" varchar(256) NOT NULL,
                "client_secret" varchar(256),
                "token_host" varchar(256),
                "token_path" varchar(128),
                "token_revoke_path" varchar(128),
                "authorize_host" varchar(256),
                "authorize_path" varchar(128),
                "user_info_host" varchar(256),
                "user_info_path" varchar(128),
                "scope" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_07596e87b9baa3122942fc2e0e9" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_oauth2_providers"(
                    "id",
                    "name",
                    "open_id",
                    "client_id",
                    "client_secret",
                    "token_host",
                    "token_path",
                    "token_revoke_path",
                    "authorize_host",
                    "authorize_path",
                    "user_info_host",
                    "user_info_path",
                    "scope",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "name",
                "open_id",
                "client_id",
                "client_secret",
                "token_host",
                "token_path",
                "token_revoke_path",
                "authorize_host",
                "authorize_path",
                "user_info_host",
                "user_info_path",
                "scope",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "auth_oauth2_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_oauth2_providers"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_oauth2_providers"
                RENAME TO "auth_oauth2_providers"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_4dbdee0f1355d411972939967d" ON "auth_oauth2_providers" ("name", "realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_54525c92a39b98d1b0b03ad708"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_oauth2_provider_accounts" (
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
                CONSTRAINT "FK_e18e50974a61970a519ea6a171f" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_e284bd0fbef34997a9f035dd741" FOREIGN KEY ("provider_id") REFERENCES "auth_oauth2_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_oauth2_provider_accounts"(
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
            FROM "auth_oauth2_provider_accounts"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_oauth2_provider_accounts"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_oauth2_provider_accounts"
                RENAME TO "auth_oauth2_provider_accounts"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_54525c92a39b98d1b0b03ad708" ON "auth_oauth2_provider_accounts" ("provider_id", "user_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_17c48da30a878499a38ac7e47c"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_039f19cbf8eadd18be864fe0c6"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_oauth2_provider_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "external_id" varchar(36) NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar,
                CONSTRAINT "FK_31ba55948469a1d19cd584a03b7" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c89543ffc106639245a4a2b99c8" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9c47ab7df9dc7300b6bca9220d0" FOREIGN KEY ("provider_id") REFERENCES "auth_oauth2_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_bbfdff6678f0b3507fef481bc26" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_oauth2_provider_roles"(
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
            FROM "auth_oauth2_provider_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_oauth2_provider_roles"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_oauth2_provider_roles"
                RENAME TO "auth_oauth2_provider_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_17c48da30a878499a38ac7e47c" ON "auth_oauth2_provider_roles" ("provider_id", "external_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_039f19cbf8eadd18be864fe0c6" ON "auth_oauth2_provider_roles" ("provider_id", "role_id")
        `);
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
                CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f795ad14f31838e3ddc663ee150" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3c95cc8e54e69c3acc2b87bc420" FOREIGN KEY ("access_token_id") REFERENCES "auth_access_tokens" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            CREATE TABLE "temporary_auth_role_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text NOT NULL,
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
                "value" text NOT NULL,
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
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "access_token_id" varchar,
                "realm_id" varchar NOT NULL
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
        await queryRunner.query(`
            DROP INDEX "IDX_039f19cbf8eadd18be864fe0c6"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_17c48da30a878499a38ac7e47c"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_oauth2_provider_roles"
                RENAME TO "temporary_auth_oauth2_provider_roles"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_oauth2_provider_roles" (
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
            INSERT INTO "auth_oauth2_provider_roles"(
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
            FROM "temporary_auth_oauth2_provider_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_oauth2_provider_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_039f19cbf8eadd18be864fe0c6" ON "auth_oauth2_provider_roles" ("provider_id", "role_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_17c48da30a878499a38ac7e47c" ON "auth_oauth2_provider_roles" ("provider_id", "external_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_54525c92a39b98d1b0b03ad708"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_oauth2_provider_accounts"
                RENAME TO "temporary_auth_oauth2_provider_accounts"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_oauth2_provider_accounts" (
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
            INSERT INTO "auth_oauth2_provider_accounts"(
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
            FROM "temporary_auth_oauth2_provider_accounts"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_oauth2_provider_accounts"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_54525c92a39b98d1b0b03ad708" ON "auth_oauth2_provider_accounts" ("provider_id", "user_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_4dbdee0f1355d411972939967d"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_oauth2_providers"
                RENAME TO "temporary_auth_oauth2_providers"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_oauth2_providers" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(36) NOT NULL,
                "open_id" boolean NOT NULL DEFAULT (0),
                "client_id" varchar(256) NOT NULL,
                "client_secret" varchar(256),
                "token_host" varchar(256),
                "token_path" varchar(128),
                "token_revoke_path" varchar(128),
                "authorize_host" varchar(256),
                "authorize_path" varchar(128),
                "user_info_host" varchar(256),
                "user_info_path" varchar(128),
                "scope" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_oauth2_providers"(
                    "id",
                    "name",
                    "open_id",
                    "client_id",
                    "client_secret",
                    "token_host",
                    "token_path",
                    "token_revoke_path",
                    "authorize_host",
                    "authorize_path",
                    "user_info_host",
                    "user_info_path",
                    "scope",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "name",
                "open_id",
                "client_id",
                "client_secret",
                "token_host",
                "token_path",
                "token_revoke_path",
                "authorize_host",
                "authorize_path",
                "user_info_host",
                "user_info_path",
                "scope",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "temporary_auth_oauth2_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_oauth2_providers"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_4dbdee0f1355d411972939967d" ON "auth_oauth2_providers" ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes"
                RENAME TO "temporary_auth_authorization_codes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_authorization_codes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" datetime NOT NULL,
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
            ALTER TABLE "auth_access_tokens"
                RENAME TO "temporary_auth_access_tokens"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_access_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_access_tokens"(
                    "id",
                    "content",
                    "expires",
                    "scope",
                    "client_id",
                    "user_id",
                    "robot_id",
                    "realm_id"
                )
            SELECT "id",
                "content",
                "expires",
                "scope",
                "client_id",
                "user_id",
                "robot_id",
                "realm_id"
            FROM "temporary_auth_access_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_access_tokens"
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
                "is_confidential" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "user_id" varchar
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
            DROP INDEX "IDX_f32b0b8138a40ced608c7cfc3e"
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
                "realm_id" varchar NOT NULL DEFAULT ('master')
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
            CREATE UNIQUE INDEX "IDX_f32b0b8138a40ced608c7cfc3e" ON "auth_robots" ("name")
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
                "permission_id" varchar NOT NULL
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
                    "permission_id"
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
                "permission_id"
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
                "permission_id" varchar NOT NULL
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
                    "permission_id"
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
                "permission_id"
            FROM "temporary_auth_role_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_role_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_40c0ee0929b20575df125e8d14" ON "auth_role_permissions" ("permission_id", "role_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_063e4bd5b708c304b51b7ee774"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_6e74f330e34555ae90068b0392"
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
                CONSTRAINT "UQ_6e74f330e34555ae90068b03928" UNIQUE ("name")
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
            CREATE INDEX "IDX_6e74f330e34555ae90068b0392" ON "auth_roles" ("name")
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
                "reset_at" datetime,
                "reset_expires" datetime,
                "status" varchar(256),
                "status_message" varchar(256),
                "active" boolean NOT NULL DEFAULT (1),
                "activate_hash" varchar(256),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar NOT NULL,
                CONSTRAINT "UQ_2d54113aa2edfc3955abcf524aa" UNIQUE ("name")
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
            DROP INDEX "IDX_039f19cbf8eadd18be864fe0c6"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_17c48da30a878499a38ac7e47c"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_oauth2_provider_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_54525c92a39b98d1b0b03ad708"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_oauth2_provider_accounts"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_4dbdee0f1355d411972939967d"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_oauth2_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_authorization_codes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_access_tokens"
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
            DROP INDEX "IDX_f32b0b8138a40ced608c7cfc3e"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robots"
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
            DROP TABLE "auth_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_063e4bd5b708c304b51b7ee774"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_6e74f330e34555ae90068b0392"
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
            DROP TABLE "auth_user_attributes"
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
