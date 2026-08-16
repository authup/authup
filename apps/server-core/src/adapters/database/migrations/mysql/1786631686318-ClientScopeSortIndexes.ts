import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Index `auth_client_scopes.created_at` and `updated_at`.
 *
 * `clientScopeSchema` was the only registered schema with no `sorts`
 * allow-list, so rapiq fell back to a syntactic name check and handed an
 * arbitrary `?sort=` key to `ORDER BY` (issue #3441). Declaring the
 * allow-list requires every listed key to lead a real entity index; the
 * two timestamp columns were the only ones missing theirs.
 */
export class ClientScopeSortIndexes1786631686318 implements MigrationInterface {
    name = 'ClientScopeSortIndexes1786631686318';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX \`IDX_52f59535945c8cdbd62439bba5\` ON \`auth_client_scopes\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_04264aebc8b6625b1da88e23df\` ON \`auth_client_scopes\` (\`updated_at\`)
        `);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_04264aebc8b6625b1da88e23df\` ON \`auth_client_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_52f59535945c8cdbd62439bba5\` ON \`auth_client_scopes\`
        `);
    }
}
