import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1722673916392 implements MigrationInterface {
    name = 'Default1722673916392';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_realms\`
            ADD \`display_name\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD \`built_in\` tinyint NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD \`display_name\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD \`built_in\` tinyint NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD \`display_name\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD \`display_name\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\`
            ADD \`display_name\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`built_in\` tinyint NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`display_name\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_scopes\`
            ADD \`display_name\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\`
            ADD \`display_name\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_realms\` CHANGE \`built_in\` \`built_in\` tinyint NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD \`display_name\` varchar(256) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD \`display_name\` varchar(128) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_realms\` CHANGE \`built_in\` \`built_in\` tinyint NOT NULL DEFAULT '1'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_scopes\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`built_in\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP COLUMN \`built_in\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP COLUMN \`display_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP COLUMN \`built_in\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_realms\` DROP COLUMN \`display_name\`
        `);
    }
}
