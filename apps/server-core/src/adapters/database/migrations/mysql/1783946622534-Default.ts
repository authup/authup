import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persisted per-scope OAuth2 consent (plan 055).
 *
 * - Adds auth_consents: one row per (client_id, sub, sub_kind, scope token)
 *   a subject has approved at POST /authorize. Rows are inserted union/keep
 *   (missing tokens only, never deleted on re-approval); built_in clients
 *   keep zero rows. expires_at is dormant (always null in Stage 1) but
 *   honored by the covering check.
 * - FKs to auth_clients / auth_realms (ON DELETE CASCADE).
 */
export class Default1783946622534 implements MigrationInterface {
    name = 'Default1783946622534';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_consents\` (
                \`id\` varchar(36) NOT NULL,
                \`sub\` varchar(64) NOT NULL,
                \`sub_kind\` varchar(64) NOT NULL,
                \`scope\` varchar(128) NOT NULL,
                \`expires_at\` varchar(28) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`client_id\` varchar(36) NOT NULL,
                \`realm_id\` varchar(36) NOT NULL,
                INDEX \`IDX_auth_consents_sub\` (\`sub\`),
                INDEX \`IDX_auth_consents_client_id\` (\`client_id\`),
                INDEX \`IDX_auth_consents_realm_id\` (\`realm_id\`),
                UNIQUE INDEX \`UQ_auth_consents_subject_scope\` (\`client_id\`, \`sub\`, \`sub_kind\`, \`scope\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_consents\`
            ADD CONSTRAINT \`FK_auth_consents_client_id\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_consents\`
            ADD CONSTRAINT \`FK_auth_consents_realm_id\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_consents\` DROP FOREIGN KEY \`FK_auth_consents_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_consents\` DROP FOREIGN KEY \`FK_auth_consents_client_id\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_auth_consents_subject_scope\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_consents_realm_id\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_consents_client_id\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_consents_sub\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_consents\`
        `);
    }
}
