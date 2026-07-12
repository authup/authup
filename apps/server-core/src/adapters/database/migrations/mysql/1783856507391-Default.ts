import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MFA — authenticator devices (plan 049) + auth-method claims (plan 050).
 *
 * - Adds auth_user_authenticators: polymorphic second-factor device rows
 *   (kind: totp/recovery/email/webauthn) hanging off a user. The TOTP seed
 *   (secret) is symmetrically encrypted at rest; recovery codes are hashed.
 *   FKs to auth_users / auth_realms (ON DELETE CASCADE).
 * - Adds auth_sessions.mfa_at: instant the subject last passed a
 *   second-factor challenge for the session (plan 049).
 * - Adds auth_sessions.auth_method: how the subject authenticated
 *   (pwd/ldap/ext/client/robot — plan 050); NULL for pre-existing sessions.
 */
export class Default1783856507391 implements MigrationInterface {
    name = 'Default1783856507391';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_user_authenticators\` (
                \`id\` varchar(36) NOT NULL,
                \`kind\` varchar(16) NOT NULL,
                \`name\` varchar(128) NULL,
                \`secret\` text NULL,
                \`parameters\` text NULL,
                \`codes\` text NULL,
                \`confirmed\` tinyint NOT NULL DEFAULT 0,
                \`last_used_at\` varchar(28) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`user_id\` varchar(36) NOT NULL,
                \`realm_id\` varchar(36) NOT NULL,
                INDEX \`IDX_auth_user_authenticators_kind\` (\`kind\`),
                INDEX \`IDX_auth_user_authenticators_user_id\` (\`user_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\`
            ADD CONSTRAINT \`FK_auth_user_authenticators_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\`
            ADD CONSTRAINT \`FK_auth_user_authenticators_realm_id\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` ADD \`mfa_at\` varchar(28) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` ADD \`auth_method\` varchar(16) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP COLUMN \`auth_method\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP COLUMN \`mfa_at\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\` DROP FOREIGN KEY \`FK_auth_user_authenticators_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\` DROP FOREIGN KEY \`FK_auth_user_authenticators_user_id\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_user_authenticators_user_id\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_user_authenticators_kind\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_user_authenticators\`
        `);
    }
}
