import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1689597906910 implements MigrationInterface {
    name = 'Default1689597906910';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_realms\` CHANGE \`drop_able\` \`built_in\` tinyint NOT NULL DEFAULT '1'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\` DROP COLUMN \`protocol_config\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\`
            ADD \`preset\` varchar(64) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\` CHANGE \`protocol\` \`protocol\` varchar(64) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\` CHANGE \`protocol\` \`protocol\` varchar(64) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\` DROP COLUMN \`preset\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\`
            ADD \`protocol_config\` varchar(64) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_realms\` CHANGE \`built_in\` \`drop_able\` tinyint NOT NULL DEFAULT '1'
        `);
    }
}
