import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * realm_scope enum on the four permission-junction tables (fail-closed realm scoping).
 *
 * Adds the coarse, actor-relative `realm_scope` column (default 'own'), migrates the
 * realm-scoping that previously lived in policies into the column, and removes the
 * baseline `system.realm-match` child of `system.default` plus the now-redundant
 * `system.realm-bound` / `system.realm-or-global` system policies.
 *
 * up() ordering is LOAD-BEARING: schema -> convert-by-policy-name -> lift-admin ->
 * unbind realm-match child -> delete policy rows (the policy-name joins must resolve
 * before the rows are deleted).
 *
 * down() is BEST-EFFORT: it drops the column only. The deleted system policies and the
 * nulled junction policy_id pointers are NOT reconstructed (the forward direction is the
 * supported path). After a down(), re-provisioning is required to restore prior behaviour.
 */
const JUNCTION_TABLES = [
    'auth_role_permissions',
    'auth_user_permissions',
    'auth_client_permissions',
    'auth_robot_permissions',
];

const SCOPE_BY_POLICY: { policy: string, scope: string }[] = [
    { policy: 'system.realm-or-global', scope: 'own_or_null' },
    { policy: 'system.realm-bound', scope: 'own' },
];

export class Default1779300000000 implements MigrationInterface {
    name = 'Default1779300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. schema
        for (const table of JUNCTION_TABLES) {
            await queryRunner.query(`
                ALTER TABLE \`${table}\`
                ADD \`realm_scope\` varchar(50) NOT NULL DEFAULT 'own'
            `);
        }

        // 2. convert the realm-scoping policies into the enum (clearing only those
        //    policy_id pointers; non-realm policies are preserved).
        for (const table of JUNCTION_TABLES) {
            for (const { policy, scope } of SCOPE_BY_POLICY) {
                await queryRunner.query(`
                    UPDATE \`${table}\` rp
                    JOIN \`auth_policies\` p ON rp.\`policy_id\` = p.\`id\`
                    SET rp.\`realm_scope\` = '${scope}', rp.\`policy_id\` = NULL
                    WHERE p.\`name\` = '${policy}'
                      AND p.\`built_in\` = 1
                      AND p.\`realm_id\` IS NULL
                `);
            }
        }

        // 3. lift admin-role grants to unrestricted (admin grants carry no policy, so
        //    they are unreachable by the policy join above — join by role name instead).
        await queryRunner.query(`
            UPDATE \`auth_role_permissions\` rp
            JOIN \`auth_roles\` r ON rp.\`role_id\` = r.\`id\`
            SET rp.\`realm_scope\` = 'any'
            WHERE r.\`name\` = 'admin'
              AND r.\`built_in\` = 1
        `);

        // 4. unbind the system.realm-match child from system.default.
        await queryRunner.query(`
            DELETE FROM \`auth_permission_policies\`
            WHERE \`policy_id\` IN (
                SELECT \`id\` FROM \`auth_policies\`
                WHERE \`name\` = 'system.realm-match' AND \`built_in\` = 1 AND \`realm_id\` IS NULL
            )
        `);

        // 5. delete the three now-redundant system realm policies (by exact name —
        //    never by type, which would wipe user-defined realm-match policies).
        await queryRunner.query(`
            DELETE FROM \`auth_policies\`
            WHERE \`name\` IN ('system.realm-match', 'system.realm-bound', 'system.realm-or-global')
              AND \`built_in\` = 1
              AND \`realm_id\` IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of JUNCTION_TABLES) {
            await queryRunner.query(`
                ALTER TABLE \`${table}\` DROP COLUMN \`realm_scope\`
            `);
        }
    }
}
