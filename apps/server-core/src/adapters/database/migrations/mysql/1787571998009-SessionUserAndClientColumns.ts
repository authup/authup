/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The beta.64 release window, folded into one migration per dialect.
 *
 * ## `auth_sessions.secret` (plan 088 Stage 1: the console session credential)
 *
 * The opaque value a console browser presents in the `authup_session` cookie.
 * It is NOT the session id: that id is published as the `sid` claim in every
 * id_token and in every `/sessions` row, so it is a public identifier and
 * cannot double as a credential. This column is the secret half.
 *
 * Nullable because every bearer-mode session has none, and unique so one value
 * resolves at most one session. The entity additionally marks it
 * `select: false`, so it is re-selected only by `findOneBySecret` and never on
 * an ordinary session read.
 *
 * ## `auth_users.email_verified` (issue #3519: the OIDC claim gets a column)
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
 * operator repairs a known-good address through the API. The column is
 * admin-settable, and denied on the self-edit path by
 * `system.user-names-self-manage`.
 *
 * ## `auth_clients` columns (issue #3355 and plan 064 Stage 1)
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

export class SessionUserAndClientColumns1787571998009 implements MigrationInterface {
    name = 'SessionUserAndClientColumns1787571998009';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD \`secret\` varchar(64) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD UNIQUE INDEX \`IDX_833c743f7cd787dfc8b70ba400\` (\`secret\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD \`email_verified\` tinyint NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`root_url\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`scope\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`backchannel_logout_uri\` varchar(2000) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`backchannel_logout_uri\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`scope\` varchar(512) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`root_url\` varchar(2000) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP COLUMN \`email_verified\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP INDEX \`IDX_833c743f7cd787dfc8b70ba400\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP COLUMN \`secret\`
        `);
    }
}
