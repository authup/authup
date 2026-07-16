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
 *   covering check. FKs to auth_clients / auth_realms and a nullable user_id
 *   FK (all ON DELETE CASCADE, so a user deletion drops its consents;
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
 * - Replaces auth_clients.is_confidential with auth_method
 *   (none/secret/tls) and adds token_binding_method (none/tls) for RFC 8705
 *   client authentication and sender-constrained tokens (plan 072).
 */
export class Default1783856507391 implements MigrationInterface {
    name = 'Default1783856507391';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_user_authenticators\` (
                \`id\` varchar(36) NOT NULL,
                \`kind\` varchar(16) NOT NULL,
                \`name\` varchar(128) NULL,
                \`secret\` text NULL,
                \`parameters\` text NULL,
                \`codes\` text NULL,
                \`confirmed\` tinyint NOT NULL DEFAULT 0,
                \`last_used_at\` varchar(28) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`user_id\` varchar(36) NOT NULL,
                \`realm_id\` varchar(36) NOT NULL,
                INDEX \`IDX_auth_user_authenticators_kind\` (\`kind\`),
                INDEX \`IDX_auth_user_authenticators_user_id\` (\`user_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\`
            ADD CONSTRAINT \`FK_auth_user_authenticators_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\`
            ADD CONSTRAINT \`FK_auth_user_authenticators_realm_id\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` ADD \`mfa_at\` varchar(28) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` ADD \`auth_method\` varchar(16) NULL
        `);

        // application access policy (plan 052)
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` ADD \`access_policy_id\` varchar(36) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD CONSTRAINT \`FK_auth_clients_access_policy_id\` FOREIGN KEY (\`access_policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // persisted per-scope consent (plan 055)
        await queryRunner.query(`
            CREATE TABLE \`auth_consents\` (
                \`id\` varchar(36) NOT NULL,
                \`sub\` varchar(64) NOT NULL,
                \`sub_kind\` varchar(64) NOT NULL,
                \`scope\` varchar(128) NOT NULL,
                \`expires_at\` varchar(28) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`client_id\` varchar(36) NOT NULL,
                \`realm_id\` varchar(36) NOT NULL,
                \`user_id\` varchar(36) NULL,
                INDEX \`IDX_auth_consents_sub\` (\`sub\`),
                INDEX \`IDX_auth_consents_client_id\` (\`client_id\`),
                INDEX \`IDX_auth_consents_realm_id\` (\`realm_id\`),
                INDEX \`IDX_auth_consents_user_id\` (\`user_id\`),
                UNIQUE INDEX \`UQ_auth_consents_subject_scope\` (\`client_id\`, \`sub\`, \`sub_kind\`, \`scope\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_consents\`
            ADD CONSTRAINT \`FK_auth_consents_client_id\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_consents\`
            ADD CONSTRAINT \`FK_auth_consents_realm_id\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_consents\`
            ADD CONSTRAINT \`FK_auth_consents_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // realm key store use discriminator (plan 069)
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` ADD \`use\` varchar(64) NOT NULL DEFAULT 'sig'
        `);

        // key management API (plan 071 Stage A)
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` ADD \`name\` varchar(128) NULL
        `);
        await queryRunner.query(`
            UPDATE \`auth_keys\` SET \`name\` = \`id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` MODIFY \`name\` varchar(128) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\`
            ADD UNIQUE INDEX \`UQ_auth_keys_name_realm_id\` (\`name\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` ADD \`status\` varchar(64) NOT NULL DEFAULT 'active'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` ADD \`certificate\` text NULL
        `);
        // Widen the key-material columns: an imported RSA-4096 private key
        // wrapped under a SECRETS_ENCRYPTION_KEY exceeds varchar(4096).
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` MODIFY \`decryption_key\` text NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` MODIFY \`encryption_key\` text NULL
        `);

        // RFC 8705 realm trust anchors (plan 071 Stage C)
        await queryRunner.query(`
            CREATE TABLE \`auth_trust_anchors\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`certificate\` text NOT NULL,
                \`enabled\` tinyint NOT NULL DEFAULT 1,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`realm_id\` varchar(36) NOT NULL,
                INDEX \`IDX_auth_trust_anchors_realm_id\` (\`realm_id\`),
                UNIQUE INDEX \`UQ_auth_trust_anchors_name_realm_id\` (\`name\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_trust_anchors\`
            ADD CONSTRAINT \`FK_auth_trust_anchors_realm_id\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // RFC 8705 client authentication and token binding (plan 072)
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` ADD \`auth_method\` varchar(16) NOT NULL DEFAULT 'none'
        `);
        await queryRunner.query(`
            UPDATE \`auth_clients\` SET \`auth_method\` = 'secret' WHERE \`is_confidential\` = 1
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` ADD \`token_binding_method\` varchar(16) NOT NULL DEFAULT 'none'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`is_confidential\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // RFC 8705 client authentication and token binding (plan 072)
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` ADD \`is_confidential\` tinyint NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            UPDATE \`auth_clients\` SET \`is_confidential\` = 1 WHERE \`auth_method\` <> 'none'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`token_binding_method\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`auth_method\`
        `);

        // RFC 8705 realm trust anchors (plan 071 Stage C)
        await queryRunner.query(`
            ALTER TABLE \`auth_trust_anchors\` DROP FOREIGN KEY \`FK_auth_trust_anchors_realm_id\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_auth_trust_anchors_name_realm_id\` ON \`auth_trust_anchors\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_trust_anchors_realm_id\` ON \`auth_trust_anchors\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_trust_anchors\`
        `);

        // key management API (plan 071 Stage A) — reverse last-in-first-out
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` MODIFY \`encryption_key\` varchar(4096) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` MODIFY \`decryption_key\` varchar(4096) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` DROP COLUMN \`certificate\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` DROP COLUMN \`status\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` DROP INDEX \`UQ_auth_keys_name_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` DROP COLUMN \`name\`
        `);

        // realm key store use discriminator (plan 069)
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` DROP COLUMN \`use\`
        `);

        // persisted per-scope consent (plan 055)
        await queryRunner.query(`
            ALTER TABLE \`auth_consents\` DROP FOREIGN KEY \`FK_auth_consents_user_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_consents\` DROP FOREIGN KEY \`FK_auth_consents_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_consents\` DROP FOREIGN KEY \`FK_auth_consents_client_id\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_auth_consents_subject_scope\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_consents_user_id\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_consents_realm_id\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_consents_client_id\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_consents_sub\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_consents\`
        `);

        // application access policy (plan 052)
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_auth_clients_access_policy_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`access_policy_id\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP COLUMN \`auth_method\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP COLUMN \`mfa_at\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\` DROP FOREIGN KEY \`FK_auth_user_authenticators_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\` DROP FOREIGN KEY \`FK_auth_user_authenticators_user_id\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_user_authenticators_user_id\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_user_authenticators_kind\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_user_authenticators\`
        `);
    }
}
