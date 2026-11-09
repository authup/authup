/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * `auth_client_token_exchange_capabilities`: one row per client and audience,
 * stating what that client may delegate through the RFC 8693 token exchange
 * grant, and for how long.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientTokenExchangeCapabilities1794155837154 implements MigrationInterface {
    name = 'ClientTokenExchangeCapabilities1794155837154';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_client_token_exchange_capabilities\` (
                \`id\` varchar(36) NOT NULL,
                \`audience\` varchar(256) NOT NULL,
                \`value\` text NOT NULL,
                \`max_age\` int NOT NULL,
                \`realm_scope\` varchar(16) NOT NULL DEFAULT 'own',
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`client_id\` varchar(255) NOT NULL,
                \`realm_id\` varchar(255) NOT NULL,
                INDEX \`IDX_20aa8806bac68731de5f98e8eb\` (\`audience\`),
                INDEX \`IDX_924ea6ec11b619581d09fbe9fe\` (\`created_at\`),
                INDEX \`IDX_2ee29e29c920a80a1406d51db4\` (\`updated_at\`),
                INDEX \`IDX_732198f4f94213e966feb01942\` (\`realm_id\`),
                UNIQUE INDEX \`IDX_a37f1bc13a6242d1cc8104aab3\` (\`client_id\`, \`audience\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_token_exchange_capabilities\`
            ADD CONSTRAINT \`FK_e52e2f2645702c2883a424ec510\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_token_exchange_capabilities\`
            ADD CONSTRAINT \`FK_732198f4f94213e966feb019425\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_client_token_exchange_capabilities\` DROP FOREIGN KEY \`FK_732198f4f94213e966feb019425\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_token_exchange_capabilities\` DROP FOREIGN KEY \`FK_e52e2f2645702c2883a424ec510\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a37f1bc13a6242d1cc8104aab3\` ON \`auth_client_token_exchange_capabilities\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_732198f4f94213e966feb01942\` ON \`auth_client_token_exchange_capabilities\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_2ee29e29c920a80a1406d51db4\` ON \`auth_client_token_exchange_capabilities\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_924ea6ec11b619581d09fbe9fe\` ON \`auth_client_token_exchange_capabilities\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_20aa8806bac68731de5f98e8eb\` ON \`auth_client_token_exchange_capabilities\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_client_token_exchange_capabilities\`
        `);
    }
}
