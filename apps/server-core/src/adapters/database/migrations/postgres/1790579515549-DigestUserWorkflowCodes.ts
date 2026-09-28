/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * `auth_users.activate_hash` and `auth_users.reset_hash` hold the SHA-256
 * digest of the code mailed for account activation and password reset, never
 * the code itself, so reading the table yields nothing that activates an
 * account or resets a password. Codes issued before this migration are
 * replaced by their digest, so the links already mailed keep working.
 *
 * Data only. `down()` cannot recover a code from its digest and leaves the
 * rows as they are, so a code issued before a revert stops matching.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DigestUserWorkflowCodes1790579515549 implements MigrationInterface {
    name = 'DigestUserWorkflowCodes1790579515549';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('UPDATE "auth_users" SET "activate_hash" = encode(sha256(convert_to("activate_hash", \'UTF8\')), \'hex\') WHERE "activate_hash" IS NOT NULL');
        await queryRunner.query('UPDATE "auth_users" SET "reset_hash" = encode(sha256(convert_to("reset_hash", \'UTF8\')), \'hex\') WHERE "reset_hash" IS NOT NULL');
    }

    public async down(): Promise<void> {
        // a digest cannot be turned back into the code it was taken from.
    }
}
