/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Daily event rollups.
 *
 * `auth_event_aggregates` holds one row per UTC day and (realm, scope, name,
 * ref_type) with the number of `auth_events` rows it stands for, so a day or
 * month statistic reads a few hundred rows instead of scanning the raw log.
 * `realm_id` deletes CASCADE: a gone realm needs no history, global events
 * keep theirs. There is no unique constraint: a recompute replaces a whole
 * day under a database lock, so duplicate rows cannot arise.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EventAggregates1790178321474 implements MigrationInterface {
    name = 'EventAggregates1790178321474';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_event_aggregates\` (
                \`id\` varchar(36) NOT NULL,
                \`day\` date NOT NULL,
                \`realm_id\` varchar(255) NULL,
                \`scope\` varchar(64) NOT NULL,
                \`name\` varchar(64) NOT NULL,
                \`ref_type\` varchar(64) NULL,
                \`count\` int NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                INDEX \`IDX_bb277f12800b91a01cf8f60aa4\` (\`day\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_event_aggregates\`
            ADD CONSTRAINT \`FK_2949cc65b187ad191fa381309ff\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_event_aggregates\` DROP FOREIGN KEY \`FK_2949cc65b187ad191fa381309ff\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_bb277f12800b91a01cf8f60aa4\` ON \`auth_event_aggregates\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_event_aggregates\`
        `);
    }
}
