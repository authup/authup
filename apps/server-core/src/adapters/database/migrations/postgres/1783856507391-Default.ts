import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MFA — authenticator devices (plan 049) + auth-method claims (plan 050).
 *
 * - Adds auth_user_authenticators: polymorphic second-factor device rows
 *   (kind: totp/recovery/email/webauthn) hanging off a user. The TOTP seed
 *   (secret) is symmetrically encrypted at rest; recovery codes are hashed.
 *   FKs to auth_users / auth_realms (ON DELETE CASCADE).
 * - Adds auth_sessions.mfa_at: instant the subject last passed a
 *   second-factor challenge for the session (plan 049).
 * - Adds auth_sessions.auth_method: how the subject authenticated
 *   (pwd/ldap/ext/client/robot — plan 050); NULL for pre-existing sessions.
 */
export class Default1783856507391 implements MigrationInterface {
    name = 'Default1783856507391';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_user_authenticators" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "kind" character varying(16) NOT NULL,
                "name" character varying(128),
                "secret" text,
                "parameters" text,
                "codes" text,
                "confirmed" boolean NOT NULL DEFAULT false,
                "last_used_at" character varying(28),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "realm_id" uuid NOT NULL,
                CONSTRAINT "PK_auth_user_authenticators" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query('CREATE INDEX "IDX_auth_user_authenticators_kind" ON "auth_user_authenticators" ("kind")');
        await queryRunner.query('CREATE INDEX "IDX_auth_user_authenticators_user_id" ON "auth_user_authenticators" ("user_id")');

        await queryRunner.query(`
            ALTER TABLE "auth_user_authenticators"
            ADD CONSTRAINT "FK_auth_user_authenticators_user_id" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_authenticators"
            ADD CONSTRAINT "FK_auth_user_authenticators_realm_id" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "auth_sessions" ADD "mfa_at" character varying(28)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" ADD "auth_method" character varying(16)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP COLUMN "auth_method"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP COLUMN "mfa_at"
        `);

        await queryRunner.query(`
            ALTER TABLE "auth_user_authenticators" DROP CONSTRAINT "FK_auth_user_authenticators_realm_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_authenticators" DROP CONSTRAINT "FK_auth_user_authenticators_user_id"
        `);
        await queryRunner.query('DROP INDEX "public"."IDX_auth_user_authenticators_user_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_user_authenticators_kind"');
        await queryRunner.query(`
            DROP TABLE "auth_user_authenticators"
        `);
    }
}
