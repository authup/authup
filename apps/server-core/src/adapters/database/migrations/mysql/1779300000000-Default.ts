import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * realm_scope enum on the four permission-junction tables (fail-closed realm scoping).
 *
 * Adds the coarse, actor-relative `realm_scope` column (default 'own') and migrates the
 * realm-scoping that previously lived in policies into the column. The redundant system
 * realm policies (`system.realm-match` child of `system.default`,
 * `system.realm-bound`, `system.realm-or-global`) are deleted here as a deterministic
 * safety net; the provisioner ALSO prunes them on boot (cleanupStaleChildren for the
 * realm-match child + the top-level stale-prune), so a fresh install needs no migration.
 *
 * up() ordering is LOAD-BEARING: schema -> convert-by-policy-name -> lift-admin ->
 * delete policy rows (the policy-name joins must resolve before the rows are deleted).
 *
 * BREAKING (existing data): only admin (-> any, matched by role name) and realm_admin
 * (its realm-or-global / realm-bound junction policies -> ownOrNull / own) are converted.
 * Every OTHER pre-existing grant with no realm policy keeps the 'own' default, so a custom
 * role or a direct identity grant that previously reached global (realm_id = null) building
 * blocks via the old system.realm-match baseline is now fail-closed to its own realm. Those
 * grants must be re-widened to ownOrNull/any by hand: there is deliberately no automatic
 * bump, because a policy-less grant that managed global resources is indistinguishable in
 * the data from one that only ever acted on its own realm (auto-widening would fail open).
 *
 * down() is BEST-EFFORT and NOT a true inverse: it drops the column only. The deleted
 * system policies and the nulled junction policy_id pointers are NOT reconstructed, and
 * boot re-provisioning does NOT repair them either -- the junction synchronizer is
 * create-only (it never rewrites realm_scope/policy_id on an already-existing row). So a
 * revert (or revert + re-run) on a POPULATED database permanently pins realm_admin and any
 * converted grant to the fail-closed 'own' default until fixed by hand; a forward-only
 * upgrade is unaffected.
 */
const JUNCTION_TABLES = [
    'auth_role_permissions',
    'auth_user_permissions',
    'auth_client_permissions',
    'auth_robot_permissions',
];

const SCOPE_BY_POLICY: { policy: string, scope: string }[] = [
    { policy: 'system.realm-or-global', scope: 'ownOrNull' },
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

        // 4. delete the three now-redundant system realm policies (by exact name —
        //    never by type, which would wipe user-defined realm-match policies).
        //    A cascading closure-tree FK detaches the realm-match child from
        //    system.default; the provisioner re-prunes idempotently on boot.
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
