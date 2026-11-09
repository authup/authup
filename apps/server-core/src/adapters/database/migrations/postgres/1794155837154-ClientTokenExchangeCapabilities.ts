/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * `auth_client_token_exchange_capabilities`: one row per client and audience,
 * stating what that client may delegate through the RFC 8693 token exchange
 * grant, and for how long.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientTokenExchangeCapabilities1794155837154 implements MigrationInterface {
    name = 'ClientTokenExchangeCapabilities1794155837154';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_client_token_exchange_capabilities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "audience" character varying(256) NOT NULL,
                "value" text NOT NULL,
                "token_max_age" integer NOT NULL,
                "realm_scope" character varying(16) NOT NULL DEFAULT 'own',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "client_id" uuid NOT NULL,
                "realm_id" uuid NOT NULL,
                CONSTRAINT "UQ_a37f1bc13a6242d1cc8104aab3a" UNIQUE ("client_id", "audience"),
                CONSTRAINT "PK_0b3f43267266d3f1b43f4603850" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_20aa8806bac68731de5f98e8eb" ON "auth_client_token_exchange_capabilities" ("audience")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_924ea6ec11b619581d09fbe9fe" ON "auth_client_token_exchange_capabilities" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2ee29e29c920a80a1406d51db4" ON "auth_client_token_exchange_capabilities" ("updated_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_732198f4f94213e966feb01942" ON "auth_client_token_exchange_capabilities" ("realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_token_exchange_capabilities"
            ADD CONSTRAINT "FK_e52e2f2645702c2883a424ec510" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_token_exchange_capabilities"
            ADD CONSTRAINT "FK_732198f4f94213e966feb019425" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_client_token_exchange_capabilities" DROP CONSTRAINT "FK_732198f4f94213e966feb019425"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_token_exchange_capabilities" DROP CONSTRAINT "FK_e52e2f2645702c2883a424ec510"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_732198f4f94213e966feb01942"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2ee29e29c920a80a1406d51db4"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_924ea6ec11b619581d09fbe9fe"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_20aa8806bac68731de5f98e8eb"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_token_exchange_capabilities"
        `);
    }
}
