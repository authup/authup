/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds auth_events.session_id: the auth_sessions row acting or affected,
 * so audit rows are correlatable per session (plan 093).
 *
 * Deliberately NO foreign key. auth_events is append-only and a row must
 * survive deletion of everything it references; sessions are routinely
 * deleted, a CASCADE would erase audit history and SET NULL would destroy
 * the correlation.
 *
 * NULL = not attributable to a session: rows written before this
 * migration, and flows with no session (a failed login, registration,
 * password recovery, the unauthenticated external IdP callback).
 */
export class EventSessionId1786320000000 implements MigrationInterface {
    name = 'EventSessionId1786320000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_events\` ADD \`session_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_auth_events_session_id\` ON \`auth_events\` (\`session_id\`)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_auth_events_session_id\` ON \`auth_events\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_events\` DROP COLUMN \`session_id\`
        `);
    }
}
