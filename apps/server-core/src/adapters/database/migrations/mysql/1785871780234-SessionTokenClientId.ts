/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds auth_session_tokens.client_id: per-application attribution one level
 * below the browser session (plan 086).
 *
 * A session on the IdP origin legitimately serves several applications (the
 * admin console, the account console, any downstream RP), so
 * auth_sessions.client_id can only ever name one of them. The token row is the
 * level where the attribution is exact, which is the same shape Authentik
 * (a client FK on every grant) and Keycloak (a client session per application
 * under one user session) use.
 *
 * The FK matches auth_sessions.client_id: ON DELETE CASCADE, so deleting a
 * client drops the tokens issued for it. Existing rows keep NULL, which reads
 * as "attribution predates this change" and never as "no client".
 */
export class SessionTokenClientId1785871780234 implements MigrationInterface {
    name = 'SessionTokenClientId1785871780234';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_session_tokens\` ADD \`client_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_session_tokens\`
            ADD CONSTRAINT \`FK_auth_session_tokens_client_id\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_session_tokens\` DROP FOREIGN KEY \`FK_auth_session_tokens_client_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_session_tokens\` DROP COLUMN \`client_id\`
        `);
    }
}
