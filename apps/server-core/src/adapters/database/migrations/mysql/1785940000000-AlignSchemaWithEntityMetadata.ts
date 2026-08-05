/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns the migrated schema with what typeorm derives from the entity
 * metadata, in two respects.
 *
 * Names: the hand-authored migrations 1783325495597, 1783769340000 and
 * 1785871780234 created their indexes, unique constraints and foreign
 * keys under readable names, while every generated migration before
 * them used typeorm's table+column hash, so the schema carried two
 * naming regimes and `migration generate` emitted 32 renames before any
 * real change. MySQL has no RENAME CONSTRAINT, so each foreign key is
 * dropped and re-added; it stores a unique constraint as a unique
 * index, so those rename through RENAME INDEX like the rest.
 *
 * Types: two of those migrations declared uuid columns as varchar(36).
 * MySQL has no uuid type, and typeorm's mysql driver only shortens to
 * 36 for columns whose value it generates itself, so a plain
 * `type: 'uuid'` column derives the generic varchar(255) that every
 * earlier table got. varchar(36) holds a uuid perfectly well; the
 * problem is that the model and the schema disagreed, so
 * `migration generate` emitted `DROP COLUMN auth_events.id` and 14
 * siblings - data loss that reads as routine in review. MODIFY COLUMN
 * widens in place, so the values survive.
 *
 * Foreign key checks are disabled for the duration: every constraint is
 * re-added exactly as it already existed, so re-validating it would only
 * add a table scan and a failure mode for rows some past import inserted
 * with the checks off. It is also what lets a foreign key column be
 * widened while its constraint is in place.
 */
export class AlignSchemaWithEntityMetadata1785940000000 implements MigrationInterface {
    name = 'AlignSchemaWithEntityMetadata1785940000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_auth_consents_sub` TO `IDX_482fa13b8f47218a844e333282`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_auth_consents_client_id` TO `IDX_adc5a3c5fa915f59ddac529f2b`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_auth_consents_realm_id` TO `IDX_089778fa70ab97a637b84957a8`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_auth_consents_user_id` TO `IDX_f945cd1ec65cc16e8462384d3a`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_client_id` TO `IDX_e50f1f5e014087edaac7240ba9`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_actor_id` TO `IDX_a5cc98d786bf9fce973ab2594f`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_actor_name` TO `IDX_ce33c3f58b802bb3c7b2668adc`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_request_ip_address` TO `IDX_5fafa06904d87cf1d77bbf4564`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_realm_id` TO `IDX_5a0f436c6949aeb968db4f2473`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_expiring` TO `IDX_0c8183e935c03317f4829cb427`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_expires_at` TO `IDX_1db311adb485ecbefd92c5daf8`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_created_at` TO `IDX_64ac9bded13b2b6b75b128d8e5`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_ref_type_ref_id` TO `IDX_12ed04e1591ed2574d1324070b`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_auth_events_name_scope` TO `IDX_85536e251a24fe5141925ee3f9`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` RENAME INDEX `IDX_auth_session_tokens_session_id` TO `IDX_cdedfe142e7b60c17140fc19d8`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` RENAME INDEX `IDX_auth_session_tokens_kind` TO `IDX_37121db8ac9517c083c473b95c`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` RENAME INDEX `IDX_auth_session_tokens_expires_at` TO `IDX_2a86161c2eae4ef90aee1fa657`');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` RENAME INDEX `IDX_auth_trust_anchors_realm_id` TO `IDX_68b091bb8e853316ad1f953673`');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` RENAME INDEX `IDX_auth_user_authenticators_kind` TO `IDX_e89cdcc8924d5fef9ae47d49d8`');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` RENAME INDEX `IDX_auth_user_authenticators_user_id` TO `IDX_ed232e3a899e0556f1b052bc50`');
        await queryRunner.query('ALTER TABLE `auth_keys` RENAME INDEX `UQ_auth_keys_name_realm_id` TO `IDX_0b3208b80576419f0b1319de7a`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `UQ_auth_consents_subject_scope` TO `IDX_8f8ad5088770598763efdb2c46`');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` RENAME INDEX `UQ_auth_trust_anchors_name_realm_id` TO `IDX_f3eacccc977b8597cc66db600f`');
        await queryRunner.query('ALTER TABLE `auth_clients` DROP FOREIGN KEY `FK_auth_clients_access_policy_id`');
        await queryRunner.query('ALTER TABLE `auth_clients` ADD CONSTRAINT `FK_7e7bca0ba30295b43b02a690511` FOREIGN KEY (`access_policy_id`) REFERENCES `auth_policies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_consents` DROP FOREIGN KEY `FK_auth_consents_client_id`');
        await queryRunner.query('ALTER TABLE `auth_consents` ADD CONSTRAINT `FK_adc5a3c5fa915f59ddac529f2b2` FOREIGN KEY (`client_id`) REFERENCES `auth_clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_consents` DROP FOREIGN KEY `FK_auth_consents_realm_id`');
        await queryRunner.query('ALTER TABLE `auth_consents` ADD CONSTRAINT `FK_089778fa70ab97a637b84957a84` FOREIGN KEY (`realm_id`) REFERENCES `auth_realms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_consents` DROP FOREIGN KEY `FK_auth_consents_user_id`');
        await queryRunner.query('ALTER TABLE `auth_consents` ADD CONSTRAINT `FK_f945cd1ec65cc16e8462384d3a8` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` DROP FOREIGN KEY `FK_auth_session_tokens_session_id`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` ADD CONSTRAINT `FK_cdedfe142e7b60c17140fc19d8a` FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` DROP FOREIGN KEY `FK_auth_session_tokens_client_id`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` ADD CONSTRAINT `FK_883cfabf7d5f7466a27625843db` FOREIGN KEY (`client_id`) REFERENCES `auth_clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` DROP FOREIGN KEY `FK_auth_trust_anchors_realm_id`');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` ADD CONSTRAINT `FK_68b091bb8e853316ad1f9536731` FOREIGN KEY (`realm_id`) REFERENCES `auth_realms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` DROP FOREIGN KEY `FK_auth_user_authenticators_user_id`');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` ADD CONSTRAINT `FK_ed232e3a899e0556f1b052bc50e` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` DROP FOREIGN KEY `FK_auth_user_authenticators_realm_id`');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` ADD CONSTRAINT `FK_db13de293f01ac8ab7bc0342c4f` FOREIGN KEY (`realm_id`) REFERENCES `auth_realms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_clients` MODIFY COLUMN `access_policy_id` varchar(255) NULL');
        await queryRunner.query('ALTER TABLE `auth_consents` MODIFY COLUMN `client_id` varchar(255) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_consents` MODIFY COLUMN `realm_id` varchar(255) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_consents` MODIFY COLUMN `user_id` varchar(255) NULL');
        await queryRunner.query('ALTER TABLE `auth_events` MODIFY COLUMN `id` varchar(255) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_events` MODIFY COLUMN `client_id` varchar(255) NULL');
        await queryRunner.query('ALTER TABLE `auth_events` MODIFY COLUMN `actor_id` varchar(255) NULL');
        await queryRunner.query('ALTER TABLE `auth_events` MODIFY COLUMN `realm_id` varchar(255) NULL');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` MODIFY COLUMN `id` varchar(255) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` MODIFY COLUMN `session_id` varchar(255) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` MODIFY COLUMN `parent_id` varchar(255) NULL');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` MODIFY COLUMN `refresh_token_id` varchar(255) NULL');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` MODIFY COLUMN `realm_id` varchar(255) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` MODIFY COLUMN `user_id` varchar(255) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` MODIFY COLUMN `realm_id` varchar(255) NOT NULL');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` MODIFY COLUMN `realm_id` varchar(36) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` MODIFY COLUMN `user_id` varchar(36) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` MODIFY COLUMN `realm_id` varchar(36) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` MODIFY COLUMN `refresh_token_id` varchar(36) NULL');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` MODIFY COLUMN `parent_id` varchar(36) NULL');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` MODIFY COLUMN `session_id` varchar(36) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` MODIFY COLUMN `id` varchar(36) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_events` MODIFY COLUMN `realm_id` varchar(36) NULL');
        await queryRunner.query('ALTER TABLE `auth_events` MODIFY COLUMN `actor_id` varchar(36) NULL');
        await queryRunner.query('ALTER TABLE `auth_events` MODIFY COLUMN `client_id` varchar(36) NULL');
        await queryRunner.query('ALTER TABLE `auth_events` MODIFY COLUMN `id` varchar(36) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_consents` MODIFY COLUMN `user_id` varchar(36) NULL');
        await queryRunner.query('ALTER TABLE `auth_consents` MODIFY COLUMN `realm_id` varchar(36) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_consents` MODIFY COLUMN `client_id` varchar(36) NOT NULL');
        await queryRunner.query('ALTER TABLE `auth_clients` MODIFY COLUMN `access_policy_id` varchar(36) NULL');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` DROP FOREIGN KEY `FK_db13de293f01ac8ab7bc0342c4f`');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` ADD CONSTRAINT `FK_auth_user_authenticators_realm_id` FOREIGN KEY (`realm_id`) REFERENCES `auth_realms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` DROP FOREIGN KEY `FK_ed232e3a899e0556f1b052bc50e`');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` ADD CONSTRAINT `FK_auth_user_authenticators_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` DROP FOREIGN KEY `FK_68b091bb8e853316ad1f9536731`');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` ADD CONSTRAINT `FK_auth_trust_anchors_realm_id` FOREIGN KEY (`realm_id`) REFERENCES `auth_realms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` DROP FOREIGN KEY `FK_883cfabf7d5f7466a27625843db`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` ADD CONSTRAINT `FK_auth_session_tokens_client_id` FOREIGN KEY (`client_id`) REFERENCES `auth_clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` DROP FOREIGN KEY `FK_cdedfe142e7b60c17140fc19d8a`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` ADD CONSTRAINT `FK_auth_session_tokens_session_id` FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_consents` DROP FOREIGN KEY `FK_f945cd1ec65cc16e8462384d3a8`');
        await queryRunner.query('ALTER TABLE `auth_consents` ADD CONSTRAINT `FK_auth_consents_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_consents` DROP FOREIGN KEY `FK_089778fa70ab97a637b84957a84`');
        await queryRunner.query('ALTER TABLE `auth_consents` ADD CONSTRAINT `FK_auth_consents_realm_id` FOREIGN KEY (`realm_id`) REFERENCES `auth_realms`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_consents` DROP FOREIGN KEY `FK_adc5a3c5fa915f59ddac529f2b2`');
        await queryRunner.query('ALTER TABLE `auth_consents` ADD CONSTRAINT `FK_auth_consents_client_id` FOREIGN KEY (`client_id`) REFERENCES `auth_clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_clients` DROP FOREIGN KEY `FK_7e7bca0ba30295b43b02a690511`');
        await queryRunner.query('ALTER TABLE `auth_clients` ADD CONSTRAINT `FK_auth_clients_access_policy_id` FOREIGN KEY (`access_policy_id`) REFERENCES `auth_policies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` RENAME INDEX `IDX_f3eacccc977b8597cc66db600f` TO `UQ_auth_trust_anchors_name_realm_id`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_8f8ad5088770598763efdb2c46` TO `UQ_auth_consents_subject_scope`');
        await queryRunner.query('ALTER TABLE `auth_keys` RENAME INDEX `IDX_0b3208b80576419f0b1319de7a` TO `UQ_auth_keys_name_realm_id`');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` RENAME INDEX `IDX_ed232e3a899e0556f1b052bc50` TO `IDX_auth_user_authenticators_user_id`');
        await queryRunner.query('ALTER TABLE `auth_user_authenticators` RENAME INDEX `IDX_e89cdcc8924d5fef9ae47d49d8` TO `IDX_auth_user_authenticators_kind`');
        await queryRunner.query('ALTER TABLE `auth_trust_anchors` RENAME INDEX `IDX_68b091bb8e853316ad1f953673` TO `IDX_auth_trust_anchors_realm_id`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` RENAME INDEX `IDX_2a86161c2eae4ef90aee1fa657` TO `IDX_auth_session_tokens_expires_at`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` RENAME INDEX `IDX_37121db8ac9517c083c473b95c` TO `IDX_auth_session_tokens_kind`');
        await queryRunner.query('ALTER TABLE `auth_session_tokens` RENAME INDEX `IDX_cdedfe142e7b60c17140fc19d8` TO `IDX_auth_session_tokens_session_id`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_85536e251a24fe5141925ee3f9` TO `IDX_auth_events_name_scope`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_12ed04e1591ed2574d1324070b` TO `IDX_auth_events_ref_type_ref_id`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_64ac9bded13b2b6b75b128d8e5` TO `IDX_auth_events_created_at`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_1db311adb485ecbefd92c5daf8` TO `IDX_auth_events_expires_at`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_0c8183e935c03317f4829cb427` TO `IDX_auth_events_expiring`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_5a0f436c6949aeb968db4f2473` TO `IDX_auth_events_realm_id`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_5fafa06904d87cf1d77bbf4564` TO `IDX_auth_events_request_ip_address`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_ce33c3f58b802bb3c7b2668adc` TO `IDX_auth_events_actor_name`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_a5cc98d786bf9fce973ab2594f` TO `IDX_auth_events_actor_id`');
        await queryRunner.query('ALTER TABLE `auth_events` RENAME INDEX `IDX_e50f1f5e014087edaac7240ba9` TO `IDX_auth_events_client_id`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_f945cd1ec65cc16e8462384d3a` TO `IDX_auth_consents_user_id`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_089778fa70ab97a637b84957a8` TO `IDX_auth_consents_realm_id`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_adc5a3c5fa915f59ddac529f2b` TO `IDX_auth_consents_client_id`');
        await queryRunner.query('ALTER TABLE `auth_consents` RENAME INDEX `IDX_482fa13b8f47218a844e333282` TO `IDX_auth_consents_sub`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    }
}
