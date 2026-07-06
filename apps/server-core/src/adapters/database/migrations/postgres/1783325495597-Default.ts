import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refresh token rotation + replay detection (plan 016).
 *
 * - Widens auth_sessions.ip_address 15 -> 45 (IPv6-sized; the old length was
 *   IPv4-only, a latent truncation bug).
 * - Adds auth_session_tokens: one durable row per issued access/refresh token,
 *   FK to auth_sessions (ON DELETE CASCADE). The row is the authority for
 *   refresh-token validity (consume/replay/revoke); the cache stays the
 *   verification fast-path.
 *
 * BREAKING: at deploy the table is empty, so every in-flight refresh token has
 * no row and its first refresh returns invalid_grant — active users
 * re-authenticate once (hard cutover, RT horizon 3 days).
 *
 * down() narrows ip_address back to 15, which fails if any IPv6 value was
 * stored (best-effort, per the 1779300000000 precedent).
 */
export class Default1783325495597 implements MigrationInterface {
    name = 'Default1783325495597';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" ALTER COLUMN "ip_address" TYPE character varying(45)
        `);

        await queryRunner.query(`
            CREATE TABLE "auth_session_tokens" (
                "id" uuid NOT NULL,
                "session_id" uuid NOT NULL,
                "kind" character varying(16) NOT NULL,
                "parent_id" uuid,
                "refresh_token_id" uuid,
                "ip_address" character varying(45) NOT NULL,
                "user_agent" character varying(512) NOT NULL,
                "consumed_at" character varying(28),
                "revoked_at" character varying(28),
                "expires_at" character varying(28) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_auth_session_tokens" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query('CREATE INDEX "IDX_auth_session_tokens_session_id" ON "auth_session_tokens" ("session_id")');
        await queryRunner.query('CREATE INDEX "IDX_auth_session_tokens_kind" ON "auth_session_tokens" ("kind")');
        await queryRunner.query('CREATE INDEX "IDX_auth_session_tokens_expires_at" ON "auth_session_tokens" ("expires_at")');

        await queryRunner.query(`
            ALTER TABLE "auth_session_tokens"
            ADD CONSTRAINT "FK_auth_session_tokens_session_id" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_session_tokens" DROP CONSTRAINT "FK_auth_session_tokens_session_id"
        `);
        await queryRunner.query('DROP INDEX "public"."IDX_auth_session_tokens_expires_at"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_session_tokens_kind"');
        await queryRunner.query('DROP INDEX "public"."IDX_auth_session_tokens_session_id"');
        await queryRunner.query(`
            DROP TABLE "auth_session_tokens"
        `);

        await queryRunner.query(`
            ALTER TABLE "auth_sessions" ALTER COLUMN "ip_address" TYPE character varying(15)
        `);
    }
}
