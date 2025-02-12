import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1739350578340 implements MigrationInterface {
    name = 'Default1739350578340';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP FOREIGN KEY \`FK_43caa964bb178ee4b5a5da7b8a7\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` CHANGE \`parentId\` \`parent_id\` varchar(36) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP COLUMN \`parent_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD \`parent_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD CONSTRAINT \`FK_14b3b3b9c0a1b3a1d2abecb6e72\` FOREIGN KEY (\`parent_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP FOREIGN KEY \`FK_14b3b3b9c0a1b3a1d2abecb6e72\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP COLUMN \`parent_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD \`parent_id\` varchar(36) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` CHANGE \`parent_id\` \`parentId\` varchar(36) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD CONSTRAINT \`FK_43caa964bb178ee4b5a5da7b8a7\` FOREIGN KEY (\`parentId\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }
}
