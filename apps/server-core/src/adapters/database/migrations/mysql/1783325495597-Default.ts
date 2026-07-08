import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refresh token rotation + replay detection (plan 016).
 *
 * - Widens auth_sessions.ip_address 15 -> 45 (IPv6-sized; the old length was
 *   IPv4-only, a latent truncation bug).
 * - Adds auth_session_tokens: one durable row per issued access/refresh token,
 *   FK to auth_sessions (ON DELETE CASCADE). The row is the authority for
 *   refresh-token validity (consume/replay/revoke); the cache stays the
 *   verification fast-path.
 *
 * BREAKING: at deploy the table is empty, so every in-flight refresh token has
 * no row and its first refresh returns invalid_grant — active users
 * re-authenticate once (hard cutover, RT horizon 3 days).
 *
 * down() narrows ip_address back to 15, which fails if any IPv6 value was
 * stored (best-effort, per the 1779300000000 precedent).
 *
 * Also adds auth_clients.post_logout_redirect_uri (plan 042) — a dedicated
 * OIDC RP-Initiated Logout allow-list, no longer conflated with redirect_uri.
 * Folded into this still-unreleased migration rather than a new file.
 */
export class Default1783325495597 implements MigrationInterface {
    name = 'Default1783325495597';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` MODIFY \`ip_address\` varchar(45) NOT NULL
        `);

        await queryRunner.query(`
            CREATE TABLE \`auth_session_tokens\` (
                \`id\` varchar(36) NOT NULL,
                \`session_id\` varchar(36) NOT NULL,
                \`kind\` varchar(16) NOT NULL,
                \`parent_id\` varchar(36) NULL,
                \`refresh_token_id\` varchar(36) NULL,
                \`ip_address\` varchar(45) NOT NULL,
                \`user_agent\` varchar(512) NOT NULL,
                \`consumed_at\` varchar(28) NULL,
                \`revoked_at\` varchar(28) NULL,
                \`expires_at\` varchar(28) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                INDEX \`IDX_auth_session_tokens_session_id\` (\`session_id\`),
                INDEX \`IDX_auth_session_tokens_kind\` (\`kind\`),
                INDEX \`IDX_auth_session_tokens_expires_at\` (\`expires_at\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_session_tokens\`
            ADD CONSTRAINT \`FK_auth_session_tokens_session_id\` FOREIGN KEY (\`session_id\`) REFERENCES \`auth_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Dedicated post-logout redirect allow-list for OIDC RP-Initiated
        // Logout (plan 042) — no longer conflated with the login redirect_uri.
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` ADD \`post_logout_redirect_uri\` varchar(2000) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`post_logout_redirect_uri\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_session_tokens\` DROP FOREIGN KEY \`FK_auth_session_tokens_session_id\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_session_tokens_expires_at\` ON \`auth_session_tokens\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_session_tokens_kind\` ON \`auth_session_tokens\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_session_tokens_session_id\` ON \`auth_session_tokens\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_session_tokens\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` MODIFY \`ip_address\` varchar(15) NOT NULL
        `);
    }
}
