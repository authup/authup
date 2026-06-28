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
 * down() is BEST-EFFORT: it drops the column only. The deleted system policies and the
 * nulled junction policy_id pointers are NOT reconstructed (re-provisioning restores them).
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
                ALTER TABLE "${table}"
                ADD "realm_scope" character varying(50) NOT NULL DEFAULT 'own'
            `);
        }

        // 2. convert the realm-scoping policies into the enum (clearing only those
        //    policy_id pointers; non-realm policies are preserved).
        for (const table of JUNCTION_TABLES) {
            for (const { policy, scope } of SCOPE_BY_POLICY) {
                await queryRunner.query(`
                    UPDATE "${table}" rp
                    SET "realm_scope" = '${scope}', "policy_id" = NULL
                    FROM "auth_policies" p
                    WHERE rp."policy_id" = p."id"
                      AND p."name" = '${policy}'
                      AND p."built_in" = true
                      AND p."realm_id" IS NULL
                `);
            }
        }

        // 3. lift admin-role grants to unrestricted (admin grants carry no policy, so
        //    they are unreachable by the policy join above — join by role name instead).
        await queryRunner.query(`
            UPDATE "auth_role_permissions" rp
            SET "realm_scope" = 'any'
            FROM "auth_roles" r
            WHERE rp."role_id" = r."id"
              AND r."name" = 'admin'
              AND r."built_in" = true
        `);

        // 4. delete the three now-redundant system realm policies (by exact name —
        //    never by type, which would wipe user-defined realm-match policies).
        //    A cascading closure-tree FK detaches the realm-match child from
        //    system.default; the provisioner re-prunes idempotently on boot.
        await queryRunner.query(`
            DELETE FROM "auth_policies"
            WHERE "name" IN ('system.realm-match', 'system.realm-bound', 'system.realm-or-global')
              AND "built_in" = true
              AND "realm_id" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of JUNCTION_TABLES) {
            await queryRunner.query(`
                ALTER TABLE "${table}" DROP COLUMN "realm_scope"
            `);
        }
    }
}
