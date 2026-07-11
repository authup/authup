/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * audit_events — append-only, PII-stripped security audit log (plan 057).
 *
 * No FKs by design: a row must survive deletion of the realm/actor/client it
 * references. Retention is per-row (`expires_at`, stamped at write from
 * `auditLogRetentionDays`; NULL = keep forever) and swept by the
 * audit-event-cleaner component.
 */
export class Default1783769340000 implements MigrationInterface {
    name = 'Default1783769340000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`audit_events\` (
                \`id\` varchar(36) NOT NULL,
                \`scope\` varchar(64) NOT NULL,
                \`name\` varchar(64) NOT NULL,
                \`ref_type\` varchar(64) NULL,
                \`ref_id\` varchar(64) NULL,
                \`client_id\` varchar(36) NULL,
                \`actor_type\` varchar(16) NULL,
                \`actor_id\` varchar(36) NULL,
                \`actor_name\` varchar(128) NULL,
                \`request_path\` varchar(256) NULL,
                \`request_method\` varchar(10) NULL,
                \`request_ip_address\` varchar(45) NULL,
                \`request_user_agent\` varchar(512) NULL,
                \`realm_id\` varchar(36) NULL,
                \`data\` text NULL,
                \`expires_at\` varchar(28) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                INDEX \`IDX_audit_events_name_scope\` (\`name\`, \`scope\`),
                INDEX \`IDX_audit_events_ref_type_ref_id\` (\`ref_type\`, \`ref_id\`),
                INDEX \`IDX_audit_events_client_id\` (\`client_id\`),
                INDEX \`IDX_audit_events_actor_id\` (\`actor_id\`),
                INDEX \`IDX_audit_events_actor_name\` (\`actor_name\`),
                INDEX \`IDX_audit_events_request_ip_address\` (\`request_ip_address\`),
                INDEX \`IDX_audit_events_realm_id\` (\`realm_id\`),
                INDEX \`IDX_audit_events_expires_at\` (\`expires_at\`),
                INDEX \`IDX_audit_events_created_at\` (\`created_at\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `audit_events`');
    }
}
