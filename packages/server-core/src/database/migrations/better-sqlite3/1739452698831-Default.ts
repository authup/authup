import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1739452698831 implements MigrationInterface {
    name = 'Default1739452698831';

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
                    "updated_at",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at",
                "built_in",
                "display_name"
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
                "client_id" varchar,
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
                    "updated_at",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at",
                "built_in",
                "display_name"
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
            CREATE INDEX "IDX_8f460e65af897b9b049f582ad0" ON "auth_roles" ("client_id")
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
                CONSTRAINT "UQ_561d1b8a5a7db602df418d7cd53" UNIQUE ("name", "client_id", "realm_id"),
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
            DROP INDEX "IDX_063e4bd5b708c304b51b7ee774"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_8f460e65af897b9b049f582ad0"
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
                "client_id" varchar,
                CONSTRAINT "UQ_5456fbd03999de8005f6bb88bd8" UNIQUE ("name", "client_id", "realm_id"),
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
                    "updated_at",
                    "built_in",
                    "display_name",
                    "client_id"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at",
                "built_in",
                "display_name",
                "client_id"
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
            CREATE INDEX "IDX_8f460e65af897b9b049f582ad0" ON "auth_roles" ("client_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_063e4bd5b708c304b51b7ee774"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_8f460e65af897b9b049f582ad0"
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
                "client_id" varchar,
                CONSTRAINT "UQ_5456fbd03999de8005f6bb88bd8" UNIQUE ("name", "client_id", "realm_id"),
                CONSTRAINT "FK_063e4bd5b708c304b51b7ee7743" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_8f460e65af897b9b049f582ad0e" FOREIGN KEY ("client_id") REFERENCES "auth_realms" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
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
                    "updated_at",
                    "built_in",
                    "display_name",
                    "client_id"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at",
                "built_in",
                "display_name",
                "client_id"
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
            CREATE INDEX "IDX_8f460e65af897b9b049f582ad0" ON "auth_roles" ("client_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_8f460e65af897b9b049f582ad0"
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
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                "client_id" varchar,
                CONSTRAINT "UQ_5456fbd03999de8005f6bb88bd8" UNIQUE ("name", "client_id", "realm_id"),
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
                    "updated_at",
                    "built_in",
                    "display_name",
                    "client_id"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at",
                "built_in",
                "display_name",
                "client_id"
            FROM "temporary_auth_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_roles"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8f460e65af897b9b049f582ad0" ON "auth_roles" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_8f460e65af897b9b049f582ad0"
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
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
                "client_id" varchar,
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
                    "updated_at",
                    "built_in",
                    "display_name",
                    "client_id"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at",
                "built_in",
                "display_name",
                "client_id"
            FROM "temporary_auth_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_roles"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8f460e65af897b9b049f582ad0" ON "auth_roles" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
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
            DROP INDEX "IDX_8f460e65af897b9b049f582ad0"
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
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
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
                    "updated_at",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at",
                "built_in",
                "display_name"
            FROM "temporary_auth_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_roles"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
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
                "built_in" boolean NOT NULL DEFAULT (0),
                "display_name" varchar(256),
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
                    "updated_at",
                    "built_in",
                    "display_name"
                )
            SELECT "id",
                "name",
                "target",
                "description",
                "realm_id",
                "created_at",
                "updated_at",
                "built_in",
                "display_name"
            FROM "temporary_auth_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_auth_roles"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
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
    }
}
