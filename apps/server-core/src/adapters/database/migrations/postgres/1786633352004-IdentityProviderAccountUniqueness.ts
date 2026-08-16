import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Make `(provider_user_id, provider_id)` unique.
 *
 * "One external identity belongs to one local user" was enforced only by a
 * read-then-write in `IdentityProviderAccountManager` (issue #3442): no
 * transaction, no row lock, and nothing behind it in the schema, so two
 * concurrent completions for the same upstream subject could both observe
 * "not linked" and both insert. After that the subject resolves to whichever
 * row the database happens to order first.
 *
 * The column order matches the pre-existing non-unique index, so this is an
 * in-place uniqueness flip under the same derived name rather than a rename.
 *
 * Pre-existing duplicates abort the boot with an actionable message. They
 * would abort it anyway, since `CREATE UNIQUE INDEX` fails on them; the
 * check only decides whether the operator reads a readable sentence or a
 * hash-named driver error.
 */
export class IdentityProviderAccountUniqueness1786633352004 implements MigrationInterface {
    name = 'IdentityProviderAccountUniqueness1786633352004';

    public async up(queryRunner: QueryRunner): Promise<void> {
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
    }
}
