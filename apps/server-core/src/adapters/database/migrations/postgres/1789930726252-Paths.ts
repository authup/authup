/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Folders for users and clients.
 *
 * `auth_paths` is the realm-bound folder tree: one segment `name`, a
 * `parent_id` self reference, and the full slash `path` the server derives
 * from the parent chain and never accepts from a caller. That derived path is
 * unique per realm, so one place in one realm is one row, and a subtree is a
 * prefix on it. `parent_id` deletes CASCADE, so removing a folder removes
 * every folder below it.
 *
 * `auth_users.path_id` and `auth_clients.path_id` are the nullable, indexed
 * references into that tree. They delete SET NULL: a folder carries no
 * authorization, so removing one unfiles its users and clients rather than
 * deleting them.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Paths1789930726252 implements MigrationInterface {
    name = 'Paths1789930726252';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_paths" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(128) NOT NULL,
                "path" character varying(255) NOT NULL,
                "display_name" character varying(256),
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "parent_id" uuid,
                "realm_id" uuid NOT NULL,
                CONSTRAINT "UQ_60a34b0ceb101dfce9348d2e89e" UNIQUE ("path", "realm_id"),
                CONSTRAINT "PK_518b19043b8294417bdcad5db36" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c8ec32db0f97412a4083f44343" ON "auth_paths" ("display_name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4a58b4bc98119bdb7be28aaa25" ON "auth_paths" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c5cdb926153d9f36721b6658a1" ON "auth_paths" ("updated_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d8068d2fd1b78d7184d1600826" ON "auth_paths" ("parent_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9eae1160d870608cd8d1c4223b" ON "auth_paths" ("realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD "path_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
            ADD "path_id" uuid
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2c5ab328862c732ada1f9a76ac" ON "auth_clients" ("path_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_989d28ac7ffdf0536c240f12eb" ON "auth_users" ("path_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_paths"
            ADD CONSTRAINT "FK_d8068d2fd1b78d7184d16008264" FOREIGN KEY ("parent_id") REFERENCES "auth_paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_paths"
            ADD CONSTRAINT "FK_9eae1160d870608cd8d1c4223b6" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "FK_2c5ab328862c732ada1f9a76ac5" FOREIGN KEY ("path_id") REFERENCES "auth_paths"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
            ADD CONSTRAINT "FK_989d28ac7ffdf0536c240f12eba" FOREIGN KEY ("path_id") REFERENCES "auth_paths"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_users" DROP CONSTRAINT "FK_989d28ac7ffdf0536c240f12eba"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "FK_2c5ab328862c732ada1f9a76ac5"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_paths" DROP CONSTRAINT "FK_9eae1160d870608cd8d1c4223b6"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_paths" DROP CONSTRAINT "FK_d8068d2fd1b78d7184d16008264"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_989d28ac7ffdf0536c240f12eb"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2c5ab328862c732ada1f9a76ac"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users" DROP COLUMN "path_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "path_id"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9eae1160d870608cd8d1c4223b"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d8068d2fd1b78d7184d1600826"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c5cdb926153d9f36721b6658a1"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4a58b4bc98119bdb7be28aaa25"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c8ec32db0f97412a4083f44343"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_paths"
        `);
    }
}
