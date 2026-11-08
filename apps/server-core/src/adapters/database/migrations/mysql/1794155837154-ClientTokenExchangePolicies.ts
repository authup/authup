/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * `auth_client_token_exchange_policies`: one row per client and audience,
 * stating which capability types that client may delegate through the
 * RFC 8693 token exchange grant, and for how long.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientTokenExchangePolicies1794155837154 implements MigrationInterface {
    name = 'ClientTokenExchangePolicies1794155837154';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_client_token_exchange_policies\` (
                \`id\` varchar(36) NOT NULL,
                \`audience\` varchar(256) NOT NULL,
                \`capability_types\` text NOT NULL,
                \`max_lifetime\` int NOT NULL,
                \`subject_realm_scope\` varchar(16) NOT NULL DEFAULT 'own',
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`client_id\` varchar(255) NOT NULL,
                \`realm_id\` varchar(255) NOT NULL,
                INDEX \`IDX_d676c24f05741c00c1ee391fb4\` (\`audience\`),
                INDEX \`IDX_b69a8398f98e04e14b15252d8c\` (\`created_at\`),
                INDEX \`IDX_732139fc8e879942a84a3b9158\` (\`updated_at\`),
                INDEX \`IDX_2be223989b02a8897966b0a345\` (\`realm_id\`),
                UNIQUE INDEX \`IDX_6eda1784659a898802c30f57e0\` (\`client_id\`, \`audience\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_token_exchange_policies\`
            ADD CONSTRAINT \`FK_b3ea01d4b48e6ed1d4ef857271e\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_token_exchange_policies\`
            ADD CONSTRAINT \`FK_2be223989b02a8897966b0a345e\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_client_token_exchange_policies\` DROP FOREIGN KEY \`FK_2be223989b02a8897966b0a345e\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_token_exchange_policies\` DROP FOREIGN KEY \`FK_b3ea01d4b48e6ed1d4ef857271e\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6eda1784659a898802c30f57e0\` ON \`auth_client_token_exchange_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_2be223989b02a8897966b0a345\` ON \`auth_client_token_exchange_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_732139fc8e879942a84a3b9158\` ON \`auth_client_token_exchange_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b69a8398f98e04e14b15252d8c\` ON \`auth_client_token_exchange_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_d676c24f05741c00c1ee391fb4\` ON \`auth_client_token_exchange_policies\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_client_token_exchange_policies\`
        `);
    }
}
