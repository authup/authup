/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Folders for users and clients.
 *
 * `auth_paths` is the realm-bound folder tree: one segment `name`, a
 * `parent_id` self reference, and the full slash `path` the server derives
 * from the parent chain and never accepts from a caller. That derived path is
 * unique per realm, so one place in one realm is one row, and a subtree is a
 * prefix on it. `parent_id` deletes CASCADE, so removing a folder removes
 * every folder below it.
 *
 * `auth_users.path_id` and `auth_clients.path_id` are the nullable, indexed
 * references into that tree. They delete SET NULL: a folder carries no
 * authorization, so removing one unfiles its users and clients rather than
 * deleting them.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Paths1789930726252 implements MigrationInterface {
    name = 'Paths1789930726252';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_paths\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`path\` varchar(255) NOT NULL,
                \`display_name\` varchar(256) NULL,
                \`description\` text NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`parent_id\` varchar(255) NULL,
                \`realm_id\` varchar(255) NOT NULL,
                INDEX \`IDX_c8ec32db0f97412a4083f44343\` (\`display_name\`),
                INDEX \`IDX_4a58b4bc98119bdb7be28aaa25\` (\`created_at\`),
                INDEX \`IDX_c5cdb926153d9f36721b6658a1\` (\`updated_at\`),
                INDEX \`IDX_d8068d2fd1b78d7184d1600826\` (\`parent_id\`),
                INDEX \`IDX_9eae1160d870608cd8d1c4223b\` (\`realm_id\`),
                UNIQUE INDEX \`IDX_60a34b0ceb101dfce9348d2e89\` (\`path\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`path_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD \`path_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_2c5ab328862c732ada1f9a76ac\` ON \`auth_clients\` (\`path_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_989d28ac7ffdf0536c240f12eb\` ON \`auth_users\` (\`path_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_paths\`
            ADD CONSTRAINT \`FK_d8068d2fd1b78d7184d16008264\` FOREIGN KEY (\`parent_id\`) REFERENCES \`auth_paths\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_paths\`
            ADD CONSTRAINT \`FK_9eae1160d870608cd8d1c4223b6\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD CONSTRAINT \`FK_2c5ab328862c732ada1f9a76ac5\` FOREIGN KEY (\`path_id\`) REFERENCES \`auth_paths\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD CONSTRAINT \`FK_989d28ac7ffdf0536c240f12eba\` FOREIGN KEY (\`path_id\`) REFERENCES \`auth_paths\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP FOREIGN KEY \`FK_989d28ac7ffdf0536c240f12eba\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_2c5ab328862c732ada1f9a76ac5\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_paths\` DROP FOREIGN KEY \`FK_9eae1160d870608cd8d1c4223b6\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_paths\` DROP FOREIGN KEY \`FK_d8068d2fd1b78d7184d16008264\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_989d28ac7ffdf0536c240f12eb\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_2c5ab328862c732ada1f9a76ac\` ON \`auth_clients\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP COLUMN \`path_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`path_id\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_60a34b0ceb101dfce9348d2e89\` ON \`auth_paths\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9eae1160d870608cd8d1c4223b\` ON \`auth_paths\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_d8068d2fd1b78d7184d1600826\` ON \`auth_paths\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_c5cdb926153d9f36721b6658a1\` ON \`auth_paths\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_4a58b4bc98119bdb7be28aaa25\` ON \`auth_paths\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_c8ec32db0f97412a4083f44343\` ON \`auth_paths\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_paths\`
        `);
    }
}
