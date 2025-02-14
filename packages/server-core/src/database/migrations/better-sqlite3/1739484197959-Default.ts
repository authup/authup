import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1739484197959 implements MigrationInterface {
    name = 'Default1739484197959';

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
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
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_client_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "policy_id" varchar,
                "client_id" varchar NOT NULL,
                "client_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_3ccaff24ccf92dcd528dab81ef" ON "auth_client_permissions" ("client_id", "permission_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_client_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "client_id" varchar NOT NULL,
                "client_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2b1afa844bfc6635f92be68375" ON "auth_client_roles" ("role_id", "client_id")
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
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
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
                CONSTRAINT "UQ_561d1b8a5a7db602df418d7cd53" UNIQUE ("name", "client_id", "realm_id"),
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
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_3ccaff24ccf92dcd528dab81ef"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_client_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "policy_id" varchar,
                "client_id" varchar NOT NULL,
                "client_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_d677e1082c27aae4ede40db0e97" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_f110581fbc4bb7e6cb2140a854a" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                    CONSTRAINT "FK_b27b823c96287617e5bdf008ea8" FOREIGN KEY ("client_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                    CONSTRAINT "FK_feb56f67d0c919e7626f1df8367" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                    CONSTRAINT "FK_0d08f64ff34cb0d19deff4b1fc9" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_client_permissions"(
                    "id",
                    "policy_id",
                    "client_id",
                    "client_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "policy_id",
                "client_id",
                "client_realm_id",
                "permission_id",
                "permission_realm_id",
                "created_at",
                "updated_at"
            FROM "auth_client_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_client_permissions"
                RENAME TO "auth_client_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_3ccaff24ccf92dcd528dab81ef" ON "auth_client_permissions" ("client_id", "permission_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2b1afa844bfc6635f92be68375"
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_auth_client_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "client_id" varchar NOT NULL,
                "client_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_4fbf55515c1520be753cb84cb3c" FOREIGN KEY ("role_id") REFERENCES "auth_roles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_dbcfb3a6d68ad40775ff55b0fd3" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f88e0dfb5f8c30fc66fef320f63" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3a3a792dbd6d343c0dabe9900a3" FOREIGN KEY ("client_realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_auth_client_roles"(
                    "id",
                    "role_id",
                    "role_realm_id",
                    "client_id",
                    "client_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "role_id",
                "role_realm_id",
                "client_id",
                "client_realm_id",
                "created_at",
                "updated_at"
            FROM "auth_client_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_roles"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_client_roles"
                RENAME TO "auth_client_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2b1afa844bfc6635f92be68375" ON "auth_client_roles" ("role_id", "client_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_2b1afa844bfc6635f92be68375"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles"
                RENAME TO "temporary_auth_client_roles"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_client_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "role_id" varchar NOT NULL,
                "role_realm_id" varchar,
                "client_id" varchar NOT NULL,
                "client_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_client_roles"(
                    "id",
                    "role_id",
                    "role_realm_id",
                    "client_id",
                    "client_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "role_id",
                "role_realm_id",
                "client_id",
                "client_realm_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_client_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_client_roles"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2b1afa844bfc6635f92be68375" ON "auth_client_roles" ("role_id", "client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_3ccaff24ccf92dcd528dab81ef"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions"
                RENAME TO "temporary_auth_client_permissions"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_client_permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "policy_id" varchar,
                "client_id" varchar NOT NULL,
                "client_realm_id" varchar,
                "permission_id" varchar NOT NULL,
                "permission_realm_id" varchar,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`
            INSERT INTO "auth_client_permissions"(
                    "id",
                    "policy_id",
                    "client_id",
                    "client_realm_id",
                    "permission_id",
                    "permission_realm_id",
                    "created_at",
                    "updated_at"
                )
            SELECT "id",
                "policy_id",
                "client_id",
                "client_realm_id",
                "permission_id",
                "permission_realm_id",
                "created_at",
                "updated_at"
            FROM "temporary_auth_client_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_client_permissions"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_3ccaff24ccf92dcd528dab81ef" ON "auth_client_permissions" ("client_id", "permission_id")
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
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
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
                CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
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
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_2b1afa844bfc6635f92be68375"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_3ccaff24ccf92dcd528dab81ef"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_permissions"
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
                "display_name" varchar(256),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
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
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name", "client_id", "realm_id"),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
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
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
    }
}
