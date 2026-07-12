/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * auth_events — append-only, PII-stripped security audit log (plan 057).
 *
 * No FKs by design: a row must survive deletion of the realm/actor/client it
 * references. Retention is per-row (`expires_at`, stamped at write from
 * `eventLogRetentionDays`; NULL = keep forever) and swept by the
 * event-cleaner component.
 */
export class Default1783769340000 implements MigrationInterface {
    name = 'Default1783769340000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_events" (
                "id" uuid NOT NULL,
                "scope" character varying(64) NOT NULL,
                "name" character varying(64) NOT NULL,
                "ref_type" character varying(64),
                "ref_id" character varying(64),
                "client_id" uuid,
                "actor_type" character varying(16),
                "actor_id" uuid,
                "actor_name" character varying(128),
                "request_path" character varying(256),
                "request_method" character varying(10),
                "request_ip_address" character varying(45),
                "request_user_agent" character varying(512),
                "realm_id" uuid,
                "data" text,
                "expiring" boolean NOT NULL DEFAULT false,
                "expires_at" character varying(28),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_auth_events" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query('CREATE INDEX "IDX_auth_events_name_scope" ON "auth_events" ("name", "scope")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_ref_type_ref_id" ON "auth_events" ("ref_type", "ref_id")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_client_id" ON "auth_events" ("client_id")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_actor_id" ON "auth_events" ("actor_id")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_actor_name" ON "auth_events" ("actor_name")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_request_ip_address" ON "auth_events" ("request_ip_address")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_realm_id" ON "auth_events" ("realm_id")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_expiring" ON "auth_events" ("expiring")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_expires_at" ON "auth_events" ("expires_at")');
        await queryRunner.query('CREATE INDEX "IDX_auth_events_created_at" ON "auth_events" ("created_at")');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_created_at"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_expires_at"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_expiring"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_realm_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_request_ip_address"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_actor_name"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_actor_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_client_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_ref_type_ref_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_events_name_scope"');
        await queryRunner.query('DROP TABLE "auth_events"');
    }
}
