/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The fold of the release window's three migrations (SessionTokenClientId,
 * AlignSchemaWithEntityMetadata, EventSessionId), squashed into one file per
 * dialect before release per the migration convention. It does two things
 * on postgres.
 *
 * Columns: adds auth_session_tokens.client_id, the per-application
 * attribution one level below the browser session (plan 086; a session on
 * the IdP origin legitimately serves several applications, so
 * auth_sessions.client_id can only ever name one of them; the FK cascades
 * like its sibling, so deleting a client drops the tokens issued for it),
 * and auth_events.session_id, the auth_sessions row acting or affected, so
 * audit rows are correlatable per session (plan 093; deliberately NO
 * foreign key: auth_events is append-only and must survive deletion of
 * everything it references, so a CASCADE would erase audit history and
 * SET NULL would destroy the correlation). On both columns NULL means "not
 * attributable": rows written before this migration, and paths that
 * legitimately carry no client (an MFA-login completion) or no session (a
 * failed login, registration, password recovery, the external IdP
 * callback). Both are created under typeorm's derived constraint names, so
 * they need no rename below.
 *
 * Names: renames the indexes, unique constraints and foreign keys that the
 * hand-authored migrations 1783325495597 and 1783769340000 created under
 * readable names, onto the table+column hashes typeorm derives from the
 * entity metadata. The schema carried two naming regimes, so
 * `migration generate` reconciled every new migration against the model
 * and emitted 32 renames before the actual change. The names have no
 * runtime meaning - nothing resolves an index or constraint by name - so
 * this only moves them onto the regime the other 184 constraints already
 * follow, and the entities stop pinning names in the same change.
 *
 * Renames only, plus two NULL column additions: no table is rewritten and
 * no row is read or written. MySQL additionally widens 15 uuid columns;
 * postgres has a native uuid type and is unaffected.
 */
export class AlignSchemaWithEntityMetadata1785871780234 implements MigrationInterface {
    name = 'AlignSchemaWithEntityMetadata1785871780234';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "auth_session_tokens" ADD "client_id" uuid');
        await queryRunner.query('ALTER TABLE "auth_session_tokens" ADD CONSTRAINT "FK_883cfabf7d5f7466a27625843db" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "auth_events" ADD "session_id" uuid');
        await queryRunner.query('CREATE INDEX "IDX_cac31ef1ae7871c905a3842df4" ON "auth_events" ("session_id")');
        await queryRunner.query('ALTER INDEX "IDX_auth_consents_sub" RENAME TO "IDX_482fa13b8f47218a844e333282"');
        await queryRunner.query('ALTER INDEX "IDX_auth_consents_client_id" RENAME TO "IDX_adc5a3c5fa915f59ddac529f2b"');
        await queryRunner.query('ALTER INDEX "IDX_auth_consents_realm_id" RENAME TO "IDX_089778fa70ab97a637b84957a8"');
        await queryRunner.query('ALTER INDEX "IDX_auth_consents_user_id" RENAME TO "IDX_f945cd1ec65cc16e8462384d3a"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_client_id" RENAME TO "IDX_e50f1f5e014087edaac7240ba9"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_actor_id" RENAME TO "IDX_a5cc98d786bf9fce973ab2594f"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_actor_name" RENAME TO "IDX_ce33c3f58b802bb3c7b2668adc"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_request_ip_address" RENAME TO "IDX_5fafa06904d87cf1d77bbf4564"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_realm_id" RENAME TO "IDX_5a0f436c6949aeb968db4f2473"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_expiring" RENAME TO "IDX_0c8183e935c03317f4829cb427"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_expires_at" RENAME TO "IDX_1db311adb485ecbefd92c5daf8"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_created_at" RENAME TO "IDX_64ac9bded13b2b6b75b128d8e5"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_ref_type_ref_id" RENAME TO "IDX_12ed04e1591ed2574d1324070b"');
        await queryRunner.query('ALTER INDEX "IDX_auth_events_name_scope" RENAME TO "IDX_85536e251a24fe5141925ee3f9"');
        await queryRunner.query('ALTER INDEX "IDX_auth_session_tokens_session_id" RENAME TO "IDX_cdedfe142e7b60c17140fc19d8"');
        await queryRunner.query('ALTER INDEX "IDX_auth_session_tokens_kind" RENAME TO "IDX_37121db8ac9517c083c473b95c"');
        await queryRunner.query('ALTER INDEX "IDX_auth_session_tokens_expires_at" RENAME TO "IDX_2a86161c2eae4ef90aee1fa657"');
        await queryRunner.query('ALTER INDEX "IDX_auth_trust_anchors_realm_id" RENAME TO "IDX_68b091bb8e853316ad1f953673"');
        await queryRunner.query('ALTER INDEX "IDX_auth_user_authenticators_kind" RENAME TO "IDX_e89cdcc8924d5fef9ae47d49d8"');
        await queryRunner.query('ALTER INDEX "IDX_auth_user_authenticators_user_id" RENAME TO "IDX_ed232e3a899e0556f1b052bc50"');
        await queryRunner.query('ALTER TABLE "auth_keys" RENAME CONSTRAINT "UQ_auth_keys_name_realm_id" TO "UQ_0b3208b80576419f0b1319de7ad"');
        await queryRunner.query('ALTER TABLE "auth_consents" RENAME CONSTRAINT "UQ_auth_consents_subject_scope" TO "UQ_8f8ad5088770598763efdb2c461"');
        await queryRunner.query('ALTER TABLE "auth_trust_anchors" RENAME CONSTRAINT "UQ_auth_trust_anchors_name_realm_id" TO "UQ_f3eacccc977b8597cc66db600f1"');
        await queryRunner.query('ALTER TABLE "auth_clients" RENAME CONSTRAINT "FK_auth_clients_access_policy_id" TO "FK_7e7bca0ba30295b43b02a690511"');
        await queryRunner.query('ALTER TABLE "auth_consents" RENAME CONSTRAINT "FK_auth_consents_client_id" TO "FK_adc5a3c5fa915f59ddac529f2b2"');
        await queryRunner.query('ALTER TABLE "auth_consents" RENAME CONSTRAINT "FK_auth_consents_realm_id" TO "FK_089778fa70ab97a637b84957a84"');
        await queryRunner.query('ALTER TABLE "auth_consents" RENAME CONSTRAINT "FK_auth_consents_user_id" TO "FK_f945cd1ec65cc16e8462384d3a8"');
        await queryRunner.query('ALTER TABLE "auth_session_tokens" RENAME CONSTRAINT "FK_auth_session_tokens_session_id" TO "FK_cdedfe142e7b60c17140fc19d8a"');
        await queryRunner.query('ALTER TABLE "auth_trust_anchors" RENAME CONSTRAINT "FK_auth_trust_anchors_realm_id" TO "FK_68b091bb8e853316ad1f9536731"');
        await queryRunner.query('ALTER TABLE "auth_user_authenticators" RENAME CONSTRAINT "FK_auth_user_authenticators_user_id" TO "FK_ed232e3a899e0556f1b052bc50e"');
        await queryRunner.query('ALTER TABLE "auth_user_authenticators" RENAME CONSTRAINT "FK_auth_user_authenticators_realm_id" TO "FK_db13de293f01ac8ab7bc0342c4f"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "auth_user_authenticators" RENAME CONSTRAINT "FK_db13de293f01ac8ab7bc0342c4f" TO "FK_auth_user_authenticators_realm_id"');
        await queryRunner.query('ALTER TABLE "auth_user_authenticators" RENAME CONSTRAINT "FK_ed232e3a899e0556f1b052bc50e" TO "FK_auth_user_authenticators_user_id"');
        await queryRunner.query('ALTER TABLE "auth_trust_anchors" RENAME CONSTRAINT "FK_68b091bb8e853316ad1f9536731" TO "FK_auth_trust_anchors_realm_id"');
        await queryRunner.query('ALTER TABLE "auth_session_tokens" RENAME CONSTRAINT "FK_cdedfe142e7b60c17140fc19d8a" TO "FK_auth_session_tokens_session_id"');
        await queryRunner.query('ALTER TABLE "auth_consents" RENAME CONSTRAINT "FK_f945cd1ec65cc16e8462384d3a8" TO "FK_auth_consents_user_id"');
        await queryRunner.query('ALTER TABLE "auth_consents" RENAME CONSTRAINT "FK_089778fa70ab97a637b84957a84" TO "FK_auth_consents_realm_id"');
        await queryRunner.query('ALTER TABLE "auth_consents" RENAME CONSTRAINT "FK_adc5a3c5fa915f59ddac529f2b2" TO "FK_auth_consents_client_id"');
        await queryRunner.query('ALTER TABLE "auth_clients" RENAME CONSTRAINT "FK_7e7bca0ba30295b43b02a690511" TO "FK_auth_clients_access_policy_id"');
        await queryRunner.query('ALTER TABLE "auth_trust_anchors" RENAME CONSTRAINT "UQ_f3eacccc977b8597cc66db600f1" TO "UQ_auth_trust_anchors_name_realm_id"');
        await queryRunner.query('ALTER TABLE "auth_consents" RENAME CONSTRAINT "UQ_8f8ad5088770598763efdb2c461" TO "UQ_auth_consents_subject_scope"');
        await queryRunner.query('ALTER TABLE "auth_keys" RENAME CONSTRAINT "UQ_0b3208b80576419f0b1319de7ad" TO "UQ_auth_keys_name_realm_id"');
        await queryRunner.query('ALTER INDEX "IDX_ed232e3a899e0556f1b052bc50" RENAME TO "IDX_auth_user_authenticators_user_id"');
        await queryRunner.query('ALTER INDEX "IDX_e89cdcc8924d5fef9ae47d49d8" RENAME TO "IDX_auth_user_authenticators_kind"');
        await queryRunner.query('ALTER INDEX "IDX_68b091bb8e853316ad1f953673" RENAME TO "IDX_auth_trust_anchors_realm_id"');
        await queryRunner.query('ALTER INDEX "IDX_2a86161c2eae4ef90aee1fa657" RENAME TO "IDX_auth_session_tokens_expires_at"');
        await queryRunner.query('ALTER INDEX "IDX_37121db8ac9517c083c473b95c" RENAME TO "IDX_auth_session_tokens_kind"');
        await queryRunner.query('ALTER INDEX "IDX_cdedfe142e7b60c17140fc19d8" RENAME TO "IDX_auth_session_tokens_session_id"');
        await queryRunner.query('ALTER INDEX "IDX_85536e251a24fe5141925ee3f9" RENAME TO "IDX_auth_events_name_scope"');
        await queryRunner.query('ALTER INDEX "IDX_12ed04e1591ed2574d1324070b" RENAME TO "IDX_auth_events_ref_type_ref_id"');
        await queryRunner.query('ALTER INDEX "IDX_64ac9bded13b2b6b75b128d8e5" RENAME TO "IDX_auth_events_created_at"');
        await queryRunner.query('ALTER INDEX "IDX_1db311adb485ecbefd92c5daf8" RENAME TO "IDX_auth_events_expires_at"');
        await queryRunner.query('ALTER INDEX "IDX_0c8183e935c03317f4829cb427" RENAME TO "IDX_auth_events_expiring"');
        await queryRunner.query('ALTER INDEX "IDX_5a0f436c6949aeb968db4f2473" RENAME TO "IDX_auth_events_realm_id"');
        await queryRunner.query('ALTER INDEX "IDX_5fafa06904d87cf1d77bbf4564" RENAME TO "IDX_auth_events_request_ip_address"');
        await queryRunner.query('ALTER INDEX "IDX_ce33c3f58b802bb3c7b2668adc" RENAME TO "IDX_auth_events_actor_name"');
        await queryRunner.query('ALTER INDEX "IDX_a5cc98d786bf9fce973ab2594f" RENAME TO "IDX_auth_events_actor_id"');
        await queryRunner.query('ALTER INDEX "IDX_e50f1f5e014087edaac7240ba9" RENAME TO "IDX_auth_events_client_id"');
        await queryRunner.query('ALTER INDEX "IDX_f945cd1ec65cc16e8462384d3a" RENAME TO "IDX_auth_consents_user_id"');
        await queryRunner.query('ALTER INDEX "IDX_089778fa70ab97a637b84957a8" RENAME TO "IDX_auth_consents_realm_id"');
        await queryRunner.query('ALTER INDEX "IDX_adc5a3c5fa915f59ddac529f2b" RENAME TO "IDX_auth_consents_client_id"');
        await queryRunner.query('ALTER INDEX "IDX_482fa13b8f47218a844e333282" RENAME TO "IDX_auth_consents_sub"');
        await queryRunner.query('DROP INDEX "public"."IDX_cac31ef1ae7871c905a3842df4"');
        await queryRunner.query('ALTER TABLE "auth_events" DROP COLUMN "session_id"');
        await queryRunner.query('ALTER TABLE "auth_session_tokens" DROP CONSTRAINT "FK_883cfabf7d5f7466a27625843db"');
        await queryRunner.query('ALTER TABLE "auth_session_tokens" DROP COLUMN "client_id"');
    }
}
