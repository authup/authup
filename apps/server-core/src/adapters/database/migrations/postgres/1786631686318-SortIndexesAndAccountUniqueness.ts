import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client-scope sort indexes (issue #3441) and identity-provider account
 * uniqueness (issue #3442).
 *
 * - Indexes `auth_client_scopes.created_at` and `updated_at`.
 *   `clientScopeSchema` was the only registered schema with no `sorts`
 *   allow-list, so rapiq fell back to a syntactic name check and handed an
 *   arbitrary `?sort=` key to `ORDER BY`. Declaring the allow-list requires
 *   every listed key to lead a real entity index; the two timestamp columns
 *   were the only ones missing theirs.
 * - Makes `(provider_user_id, provider_id)` unique on
 *   `auth_identity_provider_accounts`. "One external identity belongs to one
 *   local user" was enforced only by a read-then-write in
 *   `IdentityProviderAccountManager`: no transaction, no row lock, and
 *   nothing behind it in the schema, so two concurrent completions for the
 *   same upstream subject could both observe "not linked" and both insert.
 *   After that the subject resolves to whichever row the database happens to
 *   order first. The column order matches the pre-existing non-unique index,
 *   so this is an in-place uniqueness flip under the same derived name
 *   rather than a rename.
 *
 * Pre-existing duplicates abort the boot with an actionable message. They
 * would abort it anyway, since `CREATE UNIQUE INDEX` fails on them; the
 * check only decides whether the operator reads a readable sentence or a
 * hash-named driver error.
 *
 * Generated with `migration generate`; derived IDX_<hash> names, generated
 * DDL untouched (the duplicate pre-check is hand-authored, and `down()`
 * carries the hand-corrected column order — see
 * .agents/references/typeorm.md).
 */
export class SortIndexesAndAccountUniqueness1786631686318 implements MigrationInterface {
    name = 'SortIndexesAndAccountUniqueness1786631686318';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX "IDX_52f59535945c8cdbd62439bba5" ON "auth_client_scopes" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_04264aebc8b6625b1da88e23df" ON "auth_client_scopes" ("updated_at")
        `);

        const duplicates = await queryRunner.query(`
            SELECT "provider_id", "provider_user_id", COUNT(*) AS "count"
            FROM "auth_identity_provider_accounts"
            GROUP BY "provider_id", "provider_user_id"
            HAVING COUNT(*) > 1
        `);
        if (duplicates.length > 0) {
            throw new Error(
                `Identity-provider account uniqueness migration aborted: "auth_identity_provider_accounts" holds ${duplicates.length} ` +
                'duplicate (provider_id, provider_user_id) group(s). One external identity must belong to one local user. ' +
                'Merge or delete the conflicting rows manually before re-running.',
            );
        }

        await queryRunner.query(`
            DROP INDEX "public"."IDX_ccf3fd36253755bd9a5f43c516"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_ccf3fd36253755bd9a5f43c516" ON "auth_identity_provider_accounts" ("provider_user_id", "provider_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ccf3fd36253755bd9a5f43c516"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ccf3fd36253755bd9a5f43c516" ON "auth_identity_provider_accounts" ("provider_user_id", "provider_id")
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_04264aebc8b6625b1da88e23df"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_52f59535945c8cdbd62439bba5"
        `);
    }
}
