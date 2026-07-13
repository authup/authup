import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Application access policy (plan 052).
 *
 * - Adds auth_clients.access_policy_id: nullable FK to auth_policies
 *   (ON DELETE SET NULL) — the policy that must pass for an identity to
 *   authorize against the client (null = default-allow).
 */
export class Default1783942684249 implements MigrationInterface {
    name = 'Default1783942684249';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` ADD \`access_policy_id\` varchar(36) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD CONSTRAINT \`FK_auth_clients_access_policy_id\` FOREIGN KEY (\`access_policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_auth_clients_access_policy_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`access_policy_id\`
        `);
    }
}
