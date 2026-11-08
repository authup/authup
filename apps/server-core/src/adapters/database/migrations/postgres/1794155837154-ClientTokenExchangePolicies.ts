/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * `auth_client_token_exchange_policies`: one row per client and audience,
 * stating which capability types that client may delegate through the
 * RFC 8693 token exchange grant, and for how long.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientTokenExchangePolicies1794155837154 implements MigrationInterface {
    name = 'ClientTokenExchangePolicies1794155837154';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_client_token_exchange_policies" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "audience" character varying(256) NOT NULL,
                "capability_types" text NOT NULL,
                "max_lifetime" integer NOT NULL,
                "subject_realm_scope" character varying(16) NOT NULL DEFAULT 'own',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "client_id" uuid NOT NULL,
                "realm_id" uuid NOT NULL,
                CONSTRAINT "UQ_6eda1784659a898802c30f57e09" UNIQUE ("client_id", "audience"),
                CONSTRAINT "PK_81551b30e9ea93c9a7c641c7a92" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d676c24f05741c00c1ee391fb4" ON "auth_client_token_exchange_policies" ("audience")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b69a8398f98e04e14b15252d8c" ON "auth_client_token_exchange_policies" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_732139fc8e879942a84a3b9158" ON "auth_client_token_exchange_policies" ("updated_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2be223989b02a8897966b0a345" ON "auth_client_token_exchange_policies" ("realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_token_exchange_policies"
            ADD CONSTRAINT "FK_b3ea01d4b48e6ed1d4ef857271e" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_token_exchange_policies"
            ADD CONSTRAINT "FK_2be223989b02a8897966b0a345e" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_client_token_exchange_policies" DROP CONSTRAINT "FK_2be223989b02a8897966b0a345e"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_token_exchange_policies" DROP CONSTRAINT "FK_b3ea01d4b48e6ed1d4ef857271e"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2be223989b02a8897966b0a345"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_732139fc8e879942a84a3b9158"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b69a8398f98e04e14b15252d8c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d676c24f05741c00c1ee391fb4"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_token_exchange_policies"
        `);
    }
}
