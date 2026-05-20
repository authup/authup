import type { MigrationInterface, QueryRunner } from 'typeorm';

type CollisionCheck = {
    table: string,
    groupBy: string[],
};

const NAME_COLLISION_CHECKS: CollisionCheck[] = [
    { table: 'auth_clients', groupBy: ['LOWER(TRIM(name))', 'realm_id'] },
    { table: 'auth_robots', groupBy: ['LOWER(TRIM(name))', 'realm_id'] },
    { table: 'auth_users', groupBy: ['LOWER(TRIM(name))', 'realm_id'] },
    { table: 'auth_realms', groupBy: ['LOWER(TRIM(name))'] },
    { table: 'auth_roles', groupBy: ['LOWER(TRIM(name))', 'client_id', 'realm_id'] },
    { table: 'auth_scopes', groupBy: ['LOWER(TRIM(name))', 'realm_id'] },
    { table: 'auth_permissions', groupBy: ['LOWER(TRIM(name))', 'client_id', 'realm_id'] },
    { table: 'auth_policies', groupBy: ['LOWER(TRIM(name))', 'realm_id'] },
    { table: 'auth_identity_providers', groupBy: ['LOWER(TRIM(name))', 'realm_id'] },
];

const NAME_TABLES = NAME_COLLISION_CHECKS.map((c) => c.table);

export class Default1779267068441 implements MigrationInterface {
    name = 'Default1779267068441';

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const check of NAME_COLLISION_CHECKS) {
            const groupBy = check.groupBy.join(', ');
            const rows = await queryRunner.query(`
                SELECT ${groupBy}
                FROM \`${check.table}\`
                GROUP BY ${groupBy}
                HAVING COUNT(*) > 1
            `);
            if (rows.length > 0) {
                throw new Error(
                    `Canonical-name migration aborted: \`${check.table}\` has ${rows.length} collision group(s) on ${groupBy}. ` +
                    'Merge the conflicting rows manually before re-running.',
                );
            }
        }

        for (const table of NAME_TABLES) {
            await queryRunner.query(`
                UPDATE \`${table}\`
                SET \`name\` = LOWER(TRIM(\`name\`))
                WHERE \`name\` <> LOWER(TRIM(\`name\`))
            `);
        }

        await queryRunner.query(`
            UPDATE \`auth_users\`
            SET \`email\` = LOWER(TRIM(\`email\`))
            WHERE \`email\` IS NOT NULL
              AND \`email\` <> LOWER(TRIM(\`email\`))
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP FOREIGN KEY \`FK_b1797e07106b4af61280b8edac1\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b1797e07106b4af61280b8edac\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP COLUMN \`client_id\`
        `);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD \`client_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b1797e07106b4af61280b8edac\` ON \`auth_users\` (\`client_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD CONSTRAINT \`FK_b1797e07106b4af61280b8edac1\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }
}
