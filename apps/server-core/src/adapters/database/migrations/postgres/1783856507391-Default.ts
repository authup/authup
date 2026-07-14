import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MFA — authenticator devices (plan 049) + auth-method claims (plan 050),
 * application access policy (plan 052) + persisted consent (plan 055).
 *
 * - Adds auth_user_authenticators: polymorphic second-factor device rows
 *   (kind: totp/recovery/email/webauthn) hanging off a user. The TOTP seed
 *   (secret) is symmetrically encrypted at rest; recovery codes are hashed.
 *   FKs to auth_users / auth_realms (ON DELETE CASCADE).
 * - Adds auth_sessions.mfa_at: instant the subject last passed a
 *   second-factor challenge for the session (plan 049).
 * - Adds auth_sessions.auth_method: how the subject authenticated
 *   (pwd/ldap/ext/client/robot — plan 050); NULL for pre-existing sessions.
 * - Adds auth_clients.access_policy_id: nullable FK to auth_policies
 *   (ON DELETE SET NULL) — the policy that must pass for an identity to
 *   authorize against the client (null = default-allow; plan 052).
 * - Adds auth_consents: one row per (client_id, sub, sub_kind, scope token)
 *   a subject has approved at POST /authorize. Union/keep (missing tokens
 *   only, never deleted on re-approval); built_in clients keep zero rows;
 *   expires_at is dormant (always null in Stage 1) but honored by the
 *   covering check. FKs to auth_clients / auth_realms (ON DELETE CASCADE;
 *   plan 055).
 * - Adds auth_keys.use: JWK-use discriminator (sig | enc, RFC 7517 §4.2) —
 *   generalizes auth_keys into the per-realm key store. enc rows hold the
 *   realm's auto-generated symmetric at-rest encryption key (oct) that the
 *   MFA seed cipher rides; existing rows default to sig (plan 069).
 * - Adds auth_keys.name (canonical identifier, backfilled from id),
 *   auth_keys.status (lifecycle: active/passive/disabled) and the dormant
 *   auth_keys.certificate (PEM chain, Stage B) — key management API
 *   (plan 071 Stage A).
 * - Adds auth_trust_anchors: realm-scoped public CA certificates used by
 *   RFC 8705 PKI client authentication (plan 071 Stage C).
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

        // application access policy (plan 052)
        await queryRunner.query(`
            ALTER TABLE "auth_clients" ADD "access_policy_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "FK_auth_clients_access_policy_id" FOREIGN KEY ("access_policy_id") REFERENCES "auth_policies"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // persisted per-scope consent (plan 055)
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
                "user_id" uuid,
                CONSTRAINT "UQ_auth_consents_subject_scope" UNIQUE ("client_id", "sub", "sub_kind", "scope"),
                CONSTRAINT "PK_auth_consents" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query('CREATE INDEX "IDX_auth_consents_sub" ON "auth_consents" ("sub")');
        await queryRunner.query('CREATE INDEX "IDX_auth_consents_client_id" ON "auth_consents" ("client_id")');
        await queryRunner.query('CREATE INDEX "IDX_auth_consents_realm_id" ON "auth_consents" ("realm_id")');
        await queryRunner.query('CREATE INDEX "IDX_auth_consents_user_id" ON "auth_consents" ("user_id")');

        await queryRunner.query(`
            ALTER TABLE "auth_consents"
            ADD CONSTRAINT "FK_auth_consents_client_id" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_consents"
            ADD CONSTRAINT "FK_auth_consents_realm_id" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_consents"
            ADD CONSTRAINT "FK_auth_consents_user_id" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // realm key store use discriminator (plan 069)
        await queryRunner.query(`
            ALTER TABLE "auth_keys" ADD "use" character varying(64) NOT NULL DEFAULT 'sig'
        `);

        // key management API (plan 071 Stage A)
        await queryRunner.query(`
            ALTER TABLE "auth_keys" ADD "name" character varying(128)
        `);
        await queryRunner.query(`
            UPDATE "auth_keys" SET "name" = "id"::text
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys" ALTER COLUMN "name" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys"
            ADD CONSTRAINT "UQ_auth_keys_name_realm_id" UNIQUE ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys" ADD "status" character varying(64) NOT NULL DEFAULT 'active'
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys" ADD "certificate" text
        `);

        // RFC 8705 realm trust anchors (plan 071 Stage C)
        await queryRunner.query(`
            CREATE TABLE "auth_trust_anchors" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(128) NOT NULL,
                "certificate" text NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "realm_id" uuid NOT NULL,
                CONSTRAINT "UQ_auth_trust_anchors_name_realm_id" UNIQUE ("name", "realm_id"),
                CONSTRAINT "PK_auth_trust_anchors" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query('CREATE INDEX "IDX_auth_trust_anchors_realm_id" ON "auth_trust_anchors" ("realm_id")');
        await queryRunner.query(`
            ALTER TABLE "auth_trust_anchors"
            ADD CONSTRAINT "FK_auth_trust_anchors_realm_id" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // RFC 8705 realm trust anchors (plan 071 Stage C)
        await queryRunner.query(`
            ALTER TABLE "auth_trust_anchors" DROP CONSTRAINT "FK_auth_trust_anchors_realm_id"
        `);
        await queryRunner.query('DROP INDEX "public"."IDX_auth_trust_anchors_realm_id"');
        await queryRunner.query(`
            DROP TABLE "auth_trust_anchors"
        `);

        // key management API (plan 071 Stage A) — reverse last-in-first-out
        await queryRunner.query(`
            ALTER TABLE "auth_keys" DROP COLUMN "certificate"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys" DROP COLUMN "status"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys" DROP CONSTRAINT "UQ_auth_keys_name_realm_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys" DROP COLUMN "name"
        `);

        // realm key store use discriminator (plan 069)
        await queryRunner.query(`
            ALTER TABLE "auth_keys" DROP COLUMN "use"
        `);

        // persisted per-scope consent (plan 055)
        await queryRunner.query(`
            ALTER TABLE "auth_consents" DROP CONSTRAINT "FK_auth_consents_user_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_consents" DROP CONSTRAINT "FK_auth_consents_realm_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_consents" DROP CONSTRAINT "FK_auth_consents_client_id"
        `);
        await queryRunner.query('DROP INDEX "public"."IDX_auth_consents_user_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_consents_realm_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_consents_client_id"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_consents_sub"');
        await queryRunner.query(`
            DROP TABLE "auth_consents"
        `);

        // application access policy (plan 052)
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "FK_auth_clients_access_policy_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "access_policy_id"
        `);

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
