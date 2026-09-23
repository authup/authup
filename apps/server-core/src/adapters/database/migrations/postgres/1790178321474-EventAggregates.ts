/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Daily event rollups.
 *
 * `auth_event_aggregates` holds one row per UTC day and (realm, scope, name,
 * ref_type) with the number of `auth_events` rows it stands for, so a day or
 * month statistic reads a few hundred rows instead of scanning the raw log.
 * `realm_id` deletes CASCADE: a gone realm needs no history, global events
 * keep theirs. There is no unique constraint: a recompute replaces a whole
 * day under a database lock, so duplicate rows cannot arise.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EventAggregates1790178321474 implements MigrationInterface {
    name = 'EventAggregates1790178321474';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_event_aggregates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "day" date NOT NULL,
                "realm_id" uuid,
                "scope" character varying(64) NOT NULL,
                "name" character varying(64) NOT NULL,
                "ref_type" character varying(64),
                "count" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_19f8de84322867b7791cfd1b7f3" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bb277f12800b91a01cf8f60aa4" ON "auth_event_aggregates" ("day", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_event_aggregates"
            ADD CONSTRAINT "FK_2949cc65b187ad191fa381309ff" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_event_aggregates" DROP CONSTRAINT "FK_2949cc65b187ad191fa381309ff"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bb277f12800b91a01cf8f60aa4"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_event_aggregates"
        `);
    }
}
