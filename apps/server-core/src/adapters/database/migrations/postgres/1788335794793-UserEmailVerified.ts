/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Issue #3519: the OIDC `email_verified` claim gets a column of its own.
 *
 * The claim was mapped onto `auth_users.active`, which is the account's
 * enable flag and carries no statement about the address. It was wrong in
 * both directions: registration sets `active` outright when email
 * verification is off (the default), and a federated or provisioned user is
 * created active with a synthesized `<name>@example.com`, so authup asserted
 * a verified address nobody had ever received mail at; conversely an admin
 * deactivating a user who DID complete activation flipped the claim back to
 * false.
 *
 * NOT NULL DEFAULT false, so the ALTER backfills every existing row itself.
 * False is the only safe backfill: `activate_hash` is null both after a
 * completed activation and for a user who was never asked to verify, so the
 * two states are indistinguishable and no row can be proven verified. An
 * operator repairs a known-good address through the API — the column is
 * admin-settable, and denied on the self-edit path by
 * `system.user-names-self-manage`.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserEmailVerified1788335794793 implements MigrationInterface {
    name = 'UserEmailVerified1788335794793';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_users"
            ADD "email_verified" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_users" DROP COLUMN "email_verified"
        `);
    }
}
