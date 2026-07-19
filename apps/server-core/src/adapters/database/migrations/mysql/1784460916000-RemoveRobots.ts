/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops the robot entity: auth_robots, auth_robot_roles,
 * auth_robot_permissions, auth_sessions.robot_id and the dangling robot
 * FKs on the legacy auth_refresh_tokens / auth_authorization_codes
 * tables. Robots are superseded by clients (client_credentials grant);
 * robot rows and their role/permission bindings are NOT migrated onto
 * clients — recreate machine identities as clients by hand.
 *
 * down() recreates the pre-removal schema shape, constraint names
 * included, so the older migrations' down() paths keep working.
 */
export class RemoveRobots1784460916000 implements MigrationInterface {
    name = 'RemoveRobots1784460916000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_46b30e5d8e5d5de58d454f53f8c\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP COLUMN \`robot_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\` DROP FOREIGN KEY \`FK_6be38b6dbd4ce86ca3d17494ca9\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\` DROP FOREIGN KEY \`FK_32619f36922f433e27affc169e4\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_robot_permissions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_robot_roles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_robots\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_robots\` (
                \`id\` varchar(36) NOT NULL,
                \`secret\` varchar(256) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`description\` text NULL,
                \`active\` tinyint NOT NULL DEFAULT 1,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`user_id\` varchar(255) NULL,
                \`realm_id\` varchar(255) NOT NULL,
                \`display_name\` varchar(256) NULL,
                \`client_id\` varchar(255) NULL,
                INDEX \`IDX_9c99802f3f360718344180c3f6\` (\`realm_id\`),
                UNIQUE INDEX \`IDX_f89cc2abf1d7e284a7d6cd59c1\` (\`name\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_91942a5962da3b91175eeaa2db\` ON \`auth_robots\` (\`client_id\`)
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_robot_roles\` (
                \`id\` varchar(36) NOT NULL,
                \`role_id\` varchar(255) NOT NULL,
                \`role_realm_id\` varchar(255) NULL,
                \`robot_id\` varchar(255) NOT NULL,
                \`robot_realm_id\` varchar(255) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`client_id\` varchar(36) NULL,
                UNIQUE INDEX \`IDX_515b3dc84ba9bec42bd0e92cbd\` (\`role_id\`, \`robot_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_robot_permissions\` (
                \`id\` varchar(36) NOT NULL,
                \`robot_id\` varchar(255) NOT NULL,
                \`robot_realm_id\` varchar(255) NULL,
                \`permission_id\` varchar(255) NOT NULL,
                \`permission_realm_id\` varchar(255) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`policy_id\` varchar(255) NULL,
                \`realm_scope\` varchar(50) NOT NULL DEFAULT 'own',
                UNIQUE INDEX \`IDX_0c2284272043ed8aba6689306b\` (\`permission_id\`, \`robot_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\`
            ADD CONSTRAINT \`FK_b6d73e3026e15c0af6c41ef8139\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\`
            ADD CONSTRAINT \`FK_9c99802f3f360718344180c3f68\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\`
            ADD CONSTRAINT \`FK_91942a5962da3b91175eeaa2db1\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_roles\`
            ADD CONSTRAINT \`FK_2256b04cbdb1e16e5144e14750b\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_roles\`
            ADD CONSTRAINT \`FK_28146c7babddcad18116dabfa9e\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_roles\`
            ADD CONSTRAINT \`FK_a4904e9c921294c80f75a0c3e02\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_robots\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_roles\`
            ADD CONSTRAINT \`FK_21994ec834c710276cce38c779d\` FOREIGN KEY (\`robot_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD CONSTRAINT \`FK_5af2884572a617e2532410f8221\` FOREIGN KEY (\`robot_id\`) REFERENCES \`auth_robots\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD CONSTRAINT \`FK_d52ab826ee04e008624df74cdc8\` FOREIGN KEY (\`robot_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD CONSTRAINT \`FK_b29fe901137f6944ecaf98fcb5a\` FOREIGN KEY (\`permission_id\`) REFERENCES \`auth_permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD CONSTRAINT \`FK_1cacb8af1791a5303d30cbf8590\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD CONSTRAINT \`FK_0786e0bee54b581c62d79a8cec7\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD \`robot_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD CONSTRAINT \`FK_46b30e5d8e5d5de58d454f53f8c\` FOREIGN KEY (\`robot_id\`) REFERENCES \`auth_robots\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\`
            ADD CONSTRAINT \`FK_6be38b6dbd4ce86ca3d17494ca9\` FOREIGN KEY (\`robot_id\`) REFERENCES \`auth_robots\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\`
            ADD CONSTRAINT \`FK_32619f36922f433e27affc169e4\` FOREIGN KEY (\`robot_id\`) REFERENCES \`auth_robots\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }
}
