/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Issue #3355 and plan 064 Stage 1: `auth_clients` loses its two write-only
 * columns and gains the back-channel logout endpoint.
 *
 * `scope` was a text copy of the client's scope list that nothing has read
 * since #3354: `/authorize` grants exactly the scopes bound in
 * `auth_client_scopes`, so a value here never granted anything. `root_url`
 * was stored and never resolved against anything. Both drop WITH their data;
 * the generated down() re-adds them empty, and
 * `docs/src/guide/deployment/upgrading.md` carries the export query for an
 * operator who set either.
 *
 * `backchannel_logout_uri` is the one absolute http(s) URL Authup POSTs a
 * signed `logout_token` to when a session the client received tokens for is
 * revoked (OIDC Back-Channel Logout 1.0). Nullable with no default, so every
 * existing row and every provisioned system client starts with no push.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientBackchannelLogoutUriAndDroppedColumns1788355172322 implements MigrationInterface {
    name = 'ClientBackchannelLogoutUriAndDroppedColumns1788355172322';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "scope"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "root_url"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD "backchannel_logout_uri" character varying(2000)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "backchannel_logout_uri"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD "root_url" character varying(2000)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD "scope" character varying(512)
        `);
    }
}
