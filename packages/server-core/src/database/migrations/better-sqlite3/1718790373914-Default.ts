import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1718790373914 implements MigrationInterface {
    name = 'Default1718790373914';

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_policy_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar,
                "policy_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_3a603f9d26dc5e2de355e6996fe" UNIQUE ("name", "policy_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_attribute_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "source_name" varchar(64),
                "source_value" varchar(128),
                "source_value_is_regex" boolean NOT NULL DEFAULT (0),
                "target_name" varchar(64) NOT NULL,
                "target_value" varchar(128),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_13759c902e6d063119f556f621" ON "auth_identity_provider_attribute_mappings" ("provider_id", "target_name")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_permission_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "name" varchar(64),
                "value" varchar(128),
                "value_is_regex" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_39b28b1e3bcd7a665823f15484" ON "auth_identity_provider_permission_mappings" ("provider_id", "permission_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_role_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "name" varchar(64),
                "value" varchar(128),
                "value_is_regex" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_565cc7e3b06db4552002345f75" ON "auth_identity_provider_role_mappings" ("provider_id", "role_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_policy_tree_closure" (
                "ancestor_id" varchar NOT NULL,
                "descendant_id" varchar NOT NULL,
                PRIMARY KEY ("ancestor_id", "descendant_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_864863312111829a4f4ed664c7" ON "auth_policy_tree_closure" ("ancestor_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b09663b133807f1207f499d79a" ON "auth_policy_tree_closure" ("descendant_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_40c0ee0929b20575df125e8d14"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_role_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                CONSTRAINT "FK_f9ab8919ff5d5993816f6881879" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_role_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
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
            DROP INDEX "IDX_e1a21fc2e6ac12fa29b02c4382"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_user_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                CONSTRAINT "FK_e2de70574303693fea386cc0edd" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_user_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "user_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
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
            DROP INDEX "IDX_0c2284272043ed8aba6689306b"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_robot_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_robot_permissions"(
                    "id",
                    "robot_id",
                    "robot_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
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
            DROP INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13d8b49e55a8b06bee6bbc828f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2d54113aa2edfc3955abcf524a"
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
            CREATE INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1" ON "auth_users" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_13d8b49e55a8b06bee6bbc828f" ON "auth_users" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
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
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "policy_id" varchar,
                CONSTRAINT "FK_f9ab8919ff5d5993816f6881879" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_role_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
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
            DROP INDEX "IDX_e1a21fc2e6ac12fa29b02c4382"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_user_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "policy_id" varchar,
                CONSTRAINT "FK_e2de70574303693fea386cc0edd" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_user_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "user_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
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
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9c99802f3f360718344180c3f68" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b6d73e3026e15c0af6c41ef8139" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            DROP INDEX "IDX_0c2284272043ed8aba6689306b"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_robot_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_robot_permissions"(
                    "id",
                    "robot_id",
                    "robot_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
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
            CREATE TABLE "temporary_auth_client_scopes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "default" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "client_id" varchar NOT NULL,
                "scope_id" varchar NOT NULL,
                "client_realm_id" varchar,
                "scope_realm_id" varchar,
                CONSTRAINT "UQ_ddec4250b145536333f137ff963" UNIQUE ("client_id", "scope_id"),
                CONSTRAINT "FK_471f3da9df80f92c382a586e9ca" FOREIGN KEY ("scope_id") REFERENCES "auth_scopes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6331374fa74645dae2d52547081" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            CREATE TABLE "temporary_auth_identity_provider_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "provider_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
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
                "user_realm_id" varchar,
                "provider_realm_id" varchar,
                CONSTRAINT "FK_a82bbdf79b8accbfe71326dce00" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b07582d2705a04c2e868e6c3742" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b1797e07106b4af61280b8edac" ON "auth_users" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
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
                CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b" UNIQUE ("name", "realm_id"),
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
                CONSTRAINT "FK_1d5fcbfcbba74381ca8a58a3f17" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b1797e07106b4af61280b8edac1" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_43caa964bb178ee4b5a5da7b8a7" FOREIGN KEY ("parentId") REFERENCES "auth_policies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_707089f1df498d1719972e69aef" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            CREATE TABLE "temporary_auth_policy_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar,
                "policy_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_3a603f9d26dc5e2de355e6996fe" UNIQUE ("name", "policy_id"),
                CONSTRAINT "FK_f4cdbb6a56eb93fa2598c8483de" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_8b759199b8a0213a7a0f7b1986a" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_policy_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "policy_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "policy_id",
                "created_at",
                "updated_at"
            FROM "auth_policy_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policy_attributes"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_policy_attributes"
                RENAME TO "auth_policy_attributes"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
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
                CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
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
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_40c0ee0929b20575df125e8d14"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_role_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "policy_id" varchar,
                CONSTRAINT "FK_f9ab8919ff5d5993816f6881879" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cfa1834ece97297955f4a9539ad" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_role_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "policy_id"
                )
            SELECT "id",
                "created_at",
                "updated_at",
                "role_id",
                "role_realm_id",
                "permission_id",
                "permission_realm_id",
                "policy_id"
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
            DROP INDEX "IDX_e1a21fc2e6ac12fa29b02c4382"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_user_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "policy_id" varchar,
                CONSTRAINT "FK_e2de70574303693fea386cc0edd" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f15efcb7151cdd0d54ebafdd7fa" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_user_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "user_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "policy_id"
                )
            SELECT "id",
                "created_at",
                "updated_at",
                "user_id",
                "user_realm_id",
                "permission_id",
                "permission_realm_id",
                "policy_id"
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
            DROP INDEX "IDX_9c99802f3f360718344180c3f6"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_91942a5962da3b91175eeaa2db"
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
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9c99802f3f360718344180c3f68" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b6d73e3026e15c0af6c41ef8139" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_91942a5962da3b91175eeaa2db1" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_91942a5962da3b91175eeaa2db" ON "auth_robots" ("client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0c2284272043ed8aba6689306b"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_robot_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_0786e0bee54b581c62d79a8cec7" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_robot_permissions"(
                    "id",
                    "robot_id",
                    "robot_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id"
                )
            SELECT "id",
                "robot_id",
                "robot_realm_id",
                "permission_id",
                "permission_realm_id",
                "created_at",
                "updated_at",
                "policy_id"
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
            CREATE TABLE "temporary_auth_client_scopes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "default" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "client_id" varchar NOT NULL,
                "scope_id" varchar NOT NULL,
                "client_realm_id" varchar,
                "scope_realm_id" varchar,
                CONSTRAINT "UQ_ddec4250b145536333f137ff963" UNIQUE ("client_id", "scope_id"),
                CONSTRAINT "FK_471f3da9df80f92c382a586e9ca" FOREIGN KEY ("scope_id") REFERENCES "auth_scopes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6331374fa74645dae2d52547081" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_410780c372c6b400e9c6cba7433" FOREIGN KEY ("client_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_81f39f6e4a90fc8b861cf12dbf8" FOREIGN KEY ("scope_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_client_scopes"(
                    "id",
                    "default",
                    "created_at",
                    "updated_at",
                    "client_id",
                    "scope_id",
                    "client_realm_id",
                    "scope_realm_id"
                )
            SELECT "id",
                "default",
                "created_at",
                "updated_at",
                "client_id",
                "scope_id",
                "client_realm_id",
                "scope_realm_id"
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
            CREATE TABLE "temporary_auth_identity_provider_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "provider_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                CONSTRAINT "UQ_994a26636cc20da801d5ef4ee40" UNIQUE ("name", "provider_id"),
                CONSTRAINT "FK_5ac40c5ce92142639df65a33e53" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_60411456c45c831be656fbf8506" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_provider_attributes"(
                    "id",
                    "name",
                    "value",
                    "provider_id",
                    "created_at",
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "name",
                "value",
                "provider_id",
                "created_at",
                "updated_at",
                "realm_id"
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
            DROP INDEX "IDX_13759c902e6d063119f556f621"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_provider_attribute_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "source_name" varchar(64),
                "source_value" varchar(128),
                "source_value_is_regex" boolean NOT NULL DEFAULT (0),
                "target_name" varchar(64) NOT NULL,
                "target_value" varchar(128),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL,
                CONSTRAINT "FK_af56e638d28a0cc3139c54e8259" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_58a45697736646499b3dc7f0d0c" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_provider_attribute_mappings"(
                    "id",
                    "synchronization_mode",
                    "source_name",
                    "source_value",
                    "source_value_is_regex",
                    "target_name",
                    "target_value",
                    "created_at",
                    "updated_at",
                    "provider_id",
                    "provider_realm_id"
                )
            SELECT "id",
                "synchronization_mode",
                "source_name",
                "source_value",
                "source_value_is_regex",
                "target_name",
                "target_value",
                "created_at",
                "updated_at",
                "provider_id",
                "provider_realm_id"
            FROM "auth_identity_provider_attribute_mappings"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_attribute_mappings"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_identity_provider_attribute_mappings"
                RENAME TO "auth_identity_provider_attribute_mappings"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_13759c902e6d063119f556f621" ON "auth_identity_provider_attribute_mappings" ("provider_id", "target_name")
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
                "user_realm_id" varchar,
                "provider_realm_id" varchar,
                CONSTRAINT "FK_a82bbdf79b8accbfe71326dce00" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b07582d2705a04c2e868e6c3742" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c9432656798d6116dd47a896e45" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_209348829a22e0fb2715e937e44" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                    "provider_id",
                    "user_realm_id",
                    "provider_realm_id"
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
                "provider_id",
                "user_realm_id",
                "provider_realm_id"
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
            DROP INDEX "IDX_39b28b1e3bcd7a665823f15484"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_provider_permission_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "name" varchar(64),
                "value" varchar(128),
                "value_is_regex" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL,
                CONSTRAINT "FK_f59883e2400b294414a495002ab" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_acce12b53121e9eb413f32c719d" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b3a2e4610f9162c3dca88a8cc55" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f2ea716aa0c8bd034b6f28e9eb4" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_provider_permission_mappings"(
                    "id",
                    "synchronization_mode",
                    "name",
                    "value",
                    "value_is_regex",
                    "created_at",
                    "updated_at",
                    "permission_id",
                    "permission_realm_id",
                    "provider_id",
                    "provider_realm_id"
                )
            SELECT "id",
                "synchronization_mode",
                "name",
                "value",
                "value_is_regex",
                "created_at",
                "updated_at",
                "permission_id",
                "permission_realm_id",
                "provider_id",
                "provider_realm_id"
            FROM "auth_identity_provider_permission_mappings"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_permission_mappings"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_identity_provider_permission_mappings"
                RENAME TO "auth_identity_provider_permission_mappings"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_39b28b1e3bcd7a665823f15484" ON "auth_identity_provider_permission_mappings" ("provider_id", "permission_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_565cc7e3b06db4552002345f75"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_identity_provider_role_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "name" varchar(64),
                "value" varchar(128),
                "value_is_regex" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL,
                CONSTRAINT "FK_0c89b2c523eee535a9a18422fd0" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_0c61ae237f6a87d65feed8bc452" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_e6d52ed7072ab8488806ed648fc" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f8dfd31c9dc51e1fb8409c83d05" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_identity_provider_role_mappings"(
                    "id",
                    "synchronization_mode",
                    "name",
                    "value",
                    "value_is_regex",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "provider_id",
                    "provider_realm_id"
                )
            SELECT "id",
                "synchronization_mode",
                "name",
                "value",
                "value_is_regex",
                "created_at",
                "updated_at",
                "role_id",
                "role_realm_id",
                "provider_id",
                "provider_realm_id"
            FROM "auth_identity_provider_role_mappings"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_role_mappings"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_identity_provider_role_mappings"
                RENAME TO "auth_identity_provider_role_mappings"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_565cc7e3b06db4552002345f75" ON "auth_identity_provider_role_mappings" ("provider_id", "role_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_864863312111829a4f4ed664c7"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_b09663b133807f1207f499d79a"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_policy_tree_closure" (
                "ancestor_id" varchar NOT NULL,
                "descendant_id" varchar NOT NULL,
                CONSTRAINT "FK_864863312111829a4f4ed664c79" FOREIGN KEY ("ancestor_id") REFERENCES "auth_policies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b09663b133807f1207f499d79a0" FOREIGN KEY ("descendant_id") REFERENCES "auth_policies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                PRIMARY KEY ("ancestor_id", "descendant_id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_policy_tree_closure"("ancestor_id", "descendant_id")
            SELECT "ancestor_id",
                "descendant_id"
            FROM "auth_policy_tree_closure"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policy_tree_closure"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_policy_tree_closure"
                RENAME TO "auth_policy_tree_closure"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_864863312111829a4f4ed664c7" ON "auth_policy_tree_closure" ("ancestor_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b09663b133807f1207f499d79a" ON "auth_policy_tree_closure" ("descendant_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_b09663b133807f1207f499d79a"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_864863312111829a4f4ed664c7"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policy_tree_closure"
                RENAME TO "temporary_auth_policy_tree_closure"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_policy_tree_closure" (
                "ancestor_id" varchar NOT NULL,
                "descendant_id" varchar NOT NULL,
                PRIMARY KEY ("ancestor_id", "descendant_id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_policy_tree_closure"("ancestor_id", "descendant_id")
            SELECT "ancestor_id",
                "descendant_id"
            FROM "temporary_auth_policy_tree_closure"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_policy_tree_closure"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b09663b133807f1207f499d79a" ON "auth_policy_tree_closure" ("descendant_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_864863312111829a4f4ed664c7" ON "auth_policy_tree_closure" ("ancestor_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_565cc7e3b06db4552002345f75"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings"
                RENAME TO "temporary_auth_identity_provider_role_mappings"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_role_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "name" varchar(64),
                "value" varchar(128),
                "value_is_regex" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_provider_role_mappings"(
                    "id",
                    "synchronization_mode",
                    "name",
                    "value",
                    "value_is_regex",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "provider_id",
                    "provider_realm_id"
                )
            SELECT "id",
                "synchronization_mode",
                "name",
                "value",
                "value_is_regex",
                "created_at",
                "updated_at",
                "role_id",
                "role_realm_id",
                "provider_id",
                "provider_realm_id"
            FROM "temporary_auth_identity_provider_role_mappings"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_provider_role_mappings"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_565cc7e3b06db4552002345f75" ON "auth_identity_provider_role_mappings" ("provider_id", "role_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_39b28b1e3bcd7a665823f15484"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings"
                RENAME TO "temporary_auth_identity_provider_permission_mappings"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_permission_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "name" varchar(64),
                "value" varchar(128),
                "value_is_regex" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_provider_permission_mappings"(
                    "id",
                    "synchronization_mode",
                    "name",
                    "value",
                    "value_is_regex",
                    "created_at",
                    "updated_at",
                    "permission_id",
                    "permission_realm_id",
                    "provider_id",
                    "provider_realm_id"
                )
            SELECT "id",
                "synchronization_mode",
                "name",
                "value",
                "value_is_regex",
                "created_at",
                "updated_at",
                "permission_id",
                "permission_realm_id",
                "provider_id",
                "provider_realm_id"
            FROM "temporary_auth_identity_provider_permission_mappings"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_provider_permission_mappings"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_39b28b1e3bcd7a665823f15484" ON "auth_identity_provider_permission_mappings" ("provider_id", "permission_id")
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
                "provider_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "provider_realm_id" varchar,
                CONSTRAINT "FK_a82bbdf79b8accbfe71326dce00" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b07582d2705a04c2e868e6c3742" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                    "provider_id",
                    "user_realm_id",
                    "provider_realm_id"
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
                "provider_id",
                "user_realm_id",
                "provider_realm_id"
            FROM "temporary_auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_96a230c697b83505e073713507" ON "auth_identity_provider_accounts" ("provider_id", "user_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13759c902e6d063119f556f621"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
                RENAME TO "temporary_auth_identity_provider_attribute_mappings"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_attribute_mappings" (
                "id" varchar PRIMARY KEY NOT NULL,
                "synchronization_mode" varchar(64),
                "source_name" varchar(64),
                "source_value" varchar(128),
                "source_value_is_regex" boolean NOT NULL DEFAULT (0),
                "target_name" varchar(64) NOT NULL,
                "target_value" varchar(128),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "provider_id" varchar NOT NULL,
                "provider_realm_id" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_identity_provider_attribute_mappings"(
                    "id",
                    "synchronization_mode",
                    "source_name",
                    "source_value",
                    "source_value_is_regex",
                    "target_name",
                    "target_value",
                    "created_at",
                    "updated_at",
                    "provider_id",
                    "provider_realm_id"
                )
            SELECT "id",
                "synchronization_mode",
                "source_name",
                "source_value",
                "source_value_is_regex",
                "target_name",
                "target_value",
                "created_at",
                "updated_at",
                "provider_id",
                "provider_realm_id"
            FROM "temporary_auth_identity_provider_attribute_mappings"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_provider_attribute_mappings"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_13759c902e6d063119f556f621" ON "auth_identity_provider_attribute_mappings" ("provider_id", "target_name")
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
                "realm_id" varchar,
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
                    "updated_at",
                    "realm_id"
                )
            SELECT "id",
                "name",
                "value",
                "provider_id",
                "created_at",
                "updated_at",
                "realm_id"
            FROM "temporary_auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_identity_provider_attributes"
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
                "client_realm_id" varchar,
                "scope_realm_id" varchar,
                CONSTRAINT "UQ_ddec4250b145536333f137ff963" UNIQUE ("client_id", "scope_id"),
                CONSTRAINT "FK_471f3da9df80f92c382a586e9ca" FOREIGN KEY ("scope_id") REFERENCES "auth_scopes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6331374fa74645dae2d52547081" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_client_scopes"(
                    "id",
                    "default",
                    "created_at",
                    "updated_at",
                    "client_id",
                    "scope_id",
                    "client_realm_id",
                    "scope_realm_id"
                )
            SELECT "id",
                "default",
                "created_at",
                "updated_at",
                "client_id",
                "scope_id",
                "client_realm_id",
                "scope_realm_id"
            FROM "temporary_auth_client_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_client_scopes"
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
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "policy_id" varchar,
                CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_robot_permissions"(
                    "id",
                    "robot_id",
                    "robot_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at",
                    "policy_id"
                )
            SELECT "id",
                "robot_id",
                "robot_realm_id",
                "permission_id",
                "permission_realm_id",
                "created_at",
                "updated_at",
                "policy_id"
            FROM "temporary_auth_robot_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_robot_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_0c2284272043ed8aba6689306b" ON "auth_robot_permissions" ("permission_id", "robot_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_91942a5962da3b91175eeaa2db"
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
                "client_id" varchar,
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9c99802f3f360718344180c3f68" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b6d73e3026e15c0af6c41ef8139" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            CREATE INDEX "IDX_91942a5962da3b91175eeaa2db" ON "auth_robots" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
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
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "policy_id" varchar,
                CONSTRAINT "FK_e2de70574303693fea386cc0edd" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_user_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "user_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "policy_id"
                )
            SELECT "id",
                "created_at",
                "updated_at",
                "user_id",
                "user_realm_id",
                "permission_id",
                "permission_realm_id",
                "policy_id"
            FROM "temporary_auth_user_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_user_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1a21fc2e6ac12fa29b02c4382" ON "auth_user_permissions" ("permission_id", "user_id")
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
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "policy_id" varchar,
                CONSTRAINT "FK_f9ab8919ff5d5993816f6881879" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_role_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "policy_id"
                )
            SELECT "id",
                "created_at",
                "updated_at",
                "role_id",
                "role_realm_id",
                "permission_id",
                "permission_realm_id",
                "policy_id"
            FROM "temporary_auth_role_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_role_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_40c0ee0929b20575df125e8d14" ON "auth_role_permissions" ("permission_id", "role_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
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
                "policy_id" varchar,
                "client_id" varchar,
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b" UNIQUE ("name", "realm_id"),
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
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policy_attributes"
                RENAME TO "temporary_auth_policy_attributes"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_policy_attributes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(255) NOT NULL,
                "value" text,
                "realm_id" varchar,
                "policy_id" varchar NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_3a603f9d26dc5e2de355e6996fe" UNIQUE ("name", "policy_id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_policy_attributes"(
                    "id",
                    "name",
                    "value",
                    "realm_id",
                    "policy_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "name",
                "value",
                "realm_id",
                "policy_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_policy_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_policy_attributes"
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
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id")
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
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_91942a5962da3b91175eeaa2db"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_b1797e07106b4af61280b8edac"
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
                "policy_id" varchar,
                "client_id" varchar,
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
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
                "provider_id" varchar NOT NULL,
                CONSTRAINT "FK_a82bbdf79b8accbfe71326dce00" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b07582d2705a04c2e868e6c3742" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                CONSTRAINT "UQ_ddec4250b145536333f137ff963" UNIQUE ("client_id", "scope_id"),
                CONSTRAINT "FK_471f3da9df80f92c382a586e9ca" FOREIGN KEY ("scope_id") REFERENCES "auth_scopes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6331374fa74645dae2d52547081" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            DROP INDEX "IDX_0c2284272043ed8aba6689306b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
                RENAME TO "temporary_auth_robot_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_robot_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "robot_id" varchar NOT NULL,
                "robot_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_robot_permissions"(
                    "id",
                    "robot_id",
                    "robot_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
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
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_9c99802f3f360718344180c3f68" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b6d73e3026e15c0af6c41ef8139" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            DROP INDEX "IDX_e1a21fc2e6ac12fa29b02c4382"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
                RENAME TO "temporary_auth_user_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "user_id" varchar NOT NULL,
                "user_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                CONSTRAINT "FK_e2de70574303693fea386cc0edd" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_user_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "user_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
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
            DROP INDEX "IDX_40c0ee0929b20575df125e8d14"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
                RENAME TO "temporary_auth_role_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                CONSTRAINT "FK_f9ab8919ff5d5993816f6881879" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_role_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
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
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
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
            DROP INDEX "IDX_2d54113aa2edfc3955abcf524a"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13d8b49e55a8b06bee6bbc828f"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1"
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
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id"),
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
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_13d8b49e55a8b06bee6bbc828f" ON "auth_users" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1" ON "auth_users" ("realm_id")
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
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_robot_permissions"(
                    "id",
                    "robot_id",
                    "robot_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
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
                "permission_realm_id" varchar,
                CONSTRAINT "FK_e2de70574303693fea386cc0edd" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_user_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "user_id",
                    "user_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
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
                "permission_realm_id" varchar,
                CONSTRAINT "FK_f9ab8919ff5d5993816f6881879" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_role_permissions"(
                    "id",
                    "created_at",
                    "updated_at",
                    "role_id",
                    "role_realm_id",
                    "permission_id",
                    "permission_realm_id"
                )
            SELECT "id",
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
            DROP INDEX "IDX_b09663b133807f1207f499d79a"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_864863312111829a4f4ed664c7"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policy_tree_closure"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_565cc7e3b06db4552002345f75"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_role_mappings"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_39b28b1e3bcd7a665823f15484"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_permission_mappings"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_13759c902e6d063119f556f621"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_attribute_mappings"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policy_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policies"
        `);
    }
}
