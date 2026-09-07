import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Global entity uniqueness (issue #3559).
 *
 * `auth_permissions`, `auth_roles`, `auth_scopes` and `auth_policies` are
 * unique over a tuple that contains a nullable column: `realm_id`, plus
 * `client_id` on the first two. Every supported dialect treats NULLs as
 * distinct in a unique index, so for a GLOBAL row the existing `UQ_*`
 * constraints enforce nothing, and the whole built-in catalogue is global.
 *
 * This adds one unique index per table over the same tuple with the nullable
 * members coalesced onto the empty string (never a uuid), so two global rows
 * with one name collide. The `UQ_*` constraints stay: they are what the
 * entity metadata describes, and they still serve the scoped rows.
 *
 * Hand-written DDL on both dialects, a documented exception: an index over an
 * expression cannot be described in entity metadata, so each entity declares
 * it with `synchronize: false` under a GIVEN name, which the schema builder
 * matches by name and neither creates nor drops. The name is given rather
 * than derived for two reasons: the builder never names an index it does not
 * synchronize, and on MySQL the derived `IDX_<hash>` over this column list
 * already belongs to the `UQ_*` constraint, which that dialect stores as a
 * unique index under exactly that name.
 * `test/unit/adapters/database/global-uniqueness.spec.ts` pins the entity's
 * name against the one written here.
 *
 * Pre-existing duplicates abort the boot with an actionable message before
 * any DDL runs. They would abort it anyway, since `CREATE UNIQUE INDEX` fails
 * on them; the check decides whether the operator reads which tables are
 * affected or a hash-named driver error. Merging is deliberately left to the
 * operator (docs/src/guide/deployment/upgrading.md): the losers are referenced
 * from junction rows that have to be re-pointed or dropped, and a migration
 * cannot know which of two same-named global roles a deployment meant.
 */
export class GlobalEntityUniqueness1788793885495 implements MigrationInterface {
    name = 'GlobalEntityUniqueness1788793885495';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const targets: [table: string, columns: string[]][] = [
            ['auth_permissions', ['name', 'client_id', 'realm_id']],
            ['auth_roles', ['name', 'client_id', 'realm_id']],
            ['auth_scopes', ['name', 'realm_id']],
            ['auth_policies', ['name', 'realm_id']],
        ];

        const affected: string[] = [];
        for (const [table, columns] of targets) {
            const list = columns.map((column) => `"${column}"`).join(', ');
            const duplicates = await queryRunner.query(`
                SELECT ${list}, COUNT(*) AS "count"
                FROM "${table}"
                GROUP BY ${list}
                HAVING COUNT(*) > 1
            `);
            if (duplicates.length > 0) {
                affected.push(`"${table}" (${duplicates.length} duplicate (${columns.join(', ')}) group(s))`);
            }
        }
        if (affected.length > 0) {
            throw new Error(
                `Global entity uniqueness migration aborted: ${affected.join('; ')}. ` +
                'A name must be unique among the global rows of a table (realm_id NULL, and client_id NULL where the column exists). ' +
                'Merge each group onto one survivor and re-point or drop the junction rows that reference the others ' +
                'before re-running; see docs/src/guide/deployment/upgrading.md.',
            );
        }

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_auth_permissions_global_name" ON "auth_permissions" ("name", (COALESCE("client_id"::text, '')), (COALESCE("realm_id"::text, '')))
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_auth_roles_global_name" ON "auth_roles" ("name", (COALESCE("client_id"::text, '')), (COALESCE("realm_id"::text, '')))
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_auth_scopes_global_name" ON "auth_scopes" ("name", (COALESCE("realm_id"::text, '')))
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_auth_policies_global_name" ON "auth_policies" ("name", (COALESCE("realm_id"::text, '')))
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_auth_policies_global_name"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_auth_scopes_global_name"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_auth_roles_global_name"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_auth_permissions_global_name"
        `);
    }
}
