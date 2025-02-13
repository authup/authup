import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1739452698831 implements MigrationInterface {
    name = 'Default1739452698831';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_81e4d79be52485b31ea4afeb54\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_dce62a3739791bb4fb2fb5c137\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD \`client_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_561d1b8a5a7db602df418d7cd5\` ON \`auth_permissions\` (\`name\`, \`client_id\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_8f460e65af897b9b049f582ad0\` ON \`auth_roles\` (\`client_id\`)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_5456fbd03999de8005f6bb88bd\` ON \`auth_roles\` (\`name\`, \`client_id\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD CONSTRAINT \`FK_8f460e65af897b9b049f582ad0e\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP FOREIGN KEY \`FK_8f460e65af897b9b049f582ad0e\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5456fbd03999de8005f6bb88bd\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_8f460e65af897b9b049f582ad0\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_561d1b8a5a7db602df418d7cd5\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP COLUMN \`client_id\`
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_dce62a3739791bb4fb2fb5c137\` ON \`auth_roles\` (\`name\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_81e4d79be52485b31ea4afeb54\` ON \`auth_permissions\` (\`name\`, \`realm_id\`)
        `);
    }
}
