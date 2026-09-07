/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens `auth_clients.secret` from 256 to 512 characters for the encrypted
 * storage mode (plan 105): a secret of up to 256 characters becomes a realm
 * cipher blob of about 420 characters.
 *
 * HAND-WRITTEN, the documented exception to generated DDL: typeorm's
 * `changeColumn` drops and re-adds a column whenever its length differs
 * (the `1785871780234` precedent), so `migration generate` would emit a
 * `DROP COLUMN` that empties every client secret. `ALTER COLUMN ... TYPE`
 * widens in place and keeps the values.
 *
 * `down()` narrows back to 256 and fails if a row holds a longer value,
 * which is exactly a secret stored in encrypted mode: rotate such clients
 * to another mode before reverting.
 */
export class WidenClientSecret1788782400000 implements MigrationInterface {
    name = 'WidenClientSecret1788782400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "auth_clients" ALTER COLUMN "secret" TYPE character varying(512)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "auth_clients" ALTER COLUMN "secret" TYPE character varying(256)');
    }
}
