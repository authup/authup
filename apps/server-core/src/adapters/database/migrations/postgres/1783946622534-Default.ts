import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persisted per-scope OAuth2 consent (plan 055).
 *
 * - Adds auth_consents: one row per (client_id, sub, sub_kind, scope token)
 *   a subject has approved at POST /authorize. Rows are inserted union/keep
 *   (missing tokens only, never deleted on re-approval); built_in clients
 *   keep zero rows. expires_at is dormant (always null in Stage 1) but
 *   honored by the covering check.
 * - FKs to auth_clients / auth_realms (ON DELETE CASCADE).
 */
export class Default1783946622534 implements MigrationInterface {
    name = 'Default1783946622534';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_consents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sub" character varying(64) NOT NULL,
                "sub_kind" character varying(64) NOT NULL,
                "scope" character varying(128) NOT NULL,
                "expires_at" character varying(28),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "client_id" uuid NOT NULL,
                "realm_id" uuid NOT NULL,
                CONSTRAINT "UQ_auth_consents_subject_scope" UNIQUE ("client_id", "sub", "sub_kind", "scope"),
                CONSTRAINT "PK_auth_consents" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query('CREATE INDEX "IDX_auth_consents_sub" ON "auth_consents" ("sub")');
        await queryRunner.query('CREATE INDEX "IDX_auth_consents_client_id" ON "auth_consents" ("client_id")');
        await queryRunner.query('CREATE INDEX "IDX_auth_consents_realm_id" ON "auth_consents" ("realm_id")');

        await queryRunner.query(`
            ALTER TABLE "auth_consents"
            ADD CONSTRAINT "FK_auth_consents_client_id" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_consents"
            ADD CONSTRAINT "FK_auth_consents_realm_id" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_consents" DROP CONSTRAINT "FK_auth_consents_realm_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_consents" DROP CONSTRAINT "FK_auth_consents_client_id"
        `);
        await queryRunner.query('DROP INDEX "public"."IDX_auth_consents_realm_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_consents_client_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_consents_sub"');
        await queryRunner.query(`
            DROP TABLE "auth_consents"
        `);
    }
}
