import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1739350578340 implements MigrationInterface {
    name = 'Default1739350578340';

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                    "parentId",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "type",
                "name",
                "description",
                "invert",
                "created_at",
                "updated_at",
                "realm_id",
                "parentId",
                "built_in",
                "display_name"
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
            CREATE TABLE "temporary_auth_policies" (
                "id" varchar PRIMARY KEY NOT NULL,
                "type" varchar(64) NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "invert" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "parent_id" varchar,
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
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
                    "parent_id",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "type",
                "name",
                "description",
                "invert",
                "created_at",
                "updated_at",
                "realm_id",
                "parentId",
                "built_in",
                "display_name"
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
            CREATE TABLE "temporary_auth_policies" (
                "id" varchar PRIMARY KEY NOT NULL,
                "type" varchar(64) NOT NULL,
                "name" varchar(128) NOT NULL,
                "description" text,
                "invert" boolean NOT NULL DEFAULT (0),
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
                "realm_id" varchar,
                "parent_id" varchar,
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_707089f1df498d1719972e69aef" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_14b3b3b9c0a1b3a1d2abecb6e72" FOREIGN KEY ("parent_id") REFERENCES "auth_policies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                    "parent_id",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "type",
                "name",
                "description",
                "invert",
                "created_at",
                "updated_at",
                "realm_id",
                "parent_id",
                "built_in",
                "display_name"
            FROM "auth_policies"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policies"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_auth_policies"
                RENAME TO "auth_policies"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
                "parent_id" varchar,
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_707089f1df498d1719972e69aef" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                    "parent_id",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "type",
                "name",
                "description",
                "invert",
                "created_at",
                "updated_at",
                "realm_id",
                "parent_id",
                "built_in",
                "display_name"
            FROM "temporary_auth_policies"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_policies"
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
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_707089f1df498d1719972e69aef" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                    "parentId",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "type",
                "name",
                "description",
                "invert",
                "created_at",
                "updated_at",
                "realm_id",
                "parent_id",
                "built_in",
                "display_name"
            FROM "temporary_auth_policies"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_policies"
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
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name", "realm_id"),
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
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
                CONSTRAINT "FK_43caa964bb178ee4b5a5da7b8a7" FOREIGN KEY ("parentId") REFERENCES "auth_policies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_707089f1df498d1719972e69aef" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
                    "parentId",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "type",
                "name",
                "description",
                "invert",
                "created_at",
                "updated_at",
                "realm_id",
                "parentId",
                "built_in",
                "display_name"
            FROM "temporary_auth_policies"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_policies"
        `);
    }
}
