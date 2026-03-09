import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1718790373914 implements MigrationInterface {
    name = 'Default1718790373914';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_40a392cb2ddf6b12f841d06a82\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_policies\` (
                \`id\` varchar(36) NOT NULL,
                \`type\` varchar(64) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`description\` text NULL,
                \`invert\` tinyint NOT NULL DEFAULT 0,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`realm_id\` varchar(255) NULL,
                \`parentId\` varchar(36) NULL,
                UNIQUE INDEX \`IDX_f11361718b38c80f6ac7bfd070\` (\`name\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_policy_attributes\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`value\` text NULL,
                \`realm_id\` varchar(255) NULL,
                \`policy_id\` varchar(255) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_3a603f9d26dc5e2de355e6996f\` (\`name\`, \`policy_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_identity_provider_attribute_mappings\` (
                \`id\` varchar(36) NOT NULL,
                \`synchronization_mode\` varchar(64) NULL,
                \`source_name\` varchar(64) NULL,
                \`source_value\` varchar(128) NULL,
                \`source_value_is_regex\` tinyint NOT NULL DEFAULT 0,
                \`target_name\` varchar(64) NOT NULL,
                \`target_value\` varchar(128) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`provider_id\` varchar(255) NOT NULL,
                \`provider_realm_id\` varchar(255) NOT NULL,
                UNIQUE INDEX \`IDX_13759c902e6d063119f556f621\` (\`provider_id\`, \`target_name\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_identity_provider_permission_mappings\` (
                \`id\` varchar(36) NOT NULL,
                \`synchronization_mode\` varchar(64) NULL,
                \`name\` varchar(64) NULL,
                \`value\` varchar(128) NULL,
                \`value_is_regex\` tinyint NOT NULL DEFAULT 0,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`permission_id\` varchar(255) NOT NULL,
                \`permission_realm_id\` varchar(255) NULL,
                \`provider_id\` varchar(255) NOT NULL,
                \`provider_realm_id\` varchar(255) NOT NULL,
                UNIQUE INDEX \`IDX_39b28b1e3bcd7a665823f15484\` (\`provider_id\`, \`permission_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_identity_provider_role_mappings\` (
                \`id\` varchar(36) NOT NULL,
                \`synchronization_mode\` varchar(64) NULL,
                \`name\` varchar(64) NULL,
                \`value\` varchar(128) NULL,
                \`value_is_regex\` tinyint NOT NULL DEFAULT 0,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`role_id\` varchar(255) NOT NULL,
                \`role_realm_id\` varchar(255) NULL,
                \`provider_id\` varchar(255) NOT NULL,
                \`provider_realm_id\` varchar(255) NOT NULL,
                UNIQUE INDEX \`IDX_565cc7e3b06db4552002345f75\` (\`provider_id\`, \`role_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_policy_tree_closure\` (
                \`ancestor_id\` varchar(255) NOT NULL,
                \`descendant_id\` varchar(255) NOT NULL,
                INDEX \`IDX_864863312111829a4f4ed664c7\` (\`ancestor_id\`),
                INDEX \`IDX_b09663b133807f1207f499d79a\` (\`descendant_id\`),
                PRIMARY KEY (\`ancestor_id\`, \`descendant_id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP COLUMN \`condition\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP COLUMN \`fields\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP COLUMN \`negation\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP COLUMN \`power\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP COLUMN \`target\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP COLUMN \`condition\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP COLUMN \`fields\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP COLUMN \`negation\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP COLUMN \`power\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP COLUMN \`target\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP COLUMN \`condition\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP COLUMN \`fields\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP COLUMN \`negation\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP COLUMN \`power\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP COLUMN \`target\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD \`client_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD \`policy_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD \`client_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD \`policy_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD \`policy_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\`
            ADD \`client_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD \`policy_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\`
            ADD \`client_realm_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\`
            ADD \`scope_realm_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\`
            ADD \`realm_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\`
            ADD \`user_realm_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\`
            ADD \`provider_realm_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b1797e07106b4af61280b8edac\` ON \`auth_users\` (\`client_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_0d8fb586aa4d177206142bd4ed\` ON \`auth_permissions\` (\`client_id\`)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_81e4d79be52485b31ea4afeb54\` ON \`auth_permissions\` (\`name\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_91942a5962da3b91175eeaa2db\` ON \`auth_robots\` (\`client_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD CONSTRAINT \`FK_b1797e07106b4af61280b8edac1\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD CONSTRAINT \`FK_43caa964bb178ee4b5a5da7b8a7\` FOREIGN KEY (\`parentId\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD CONSTRAINT \`FK_707089f1df498d1719972e69aef\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_attributes\`
            ADD CONSTRAINT \`FK_f4cdbb6a56eb93fa2598c8483de\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_attributes\`
            ADD CONSTRAINT \`FK_8b759199b8a0213a7a0f7b1986a\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD CONSTRAINT \`FK_b669b08267cf6486c7e44a24fb8\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD CONSTRAINT \`FK_0d8fb586aa4d177206142bd4ed5\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD CONSTRAINT \`FK_cfa1834ece97297955f4a9539ad\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD CONSTRAINT \`FK_f15efcb7151cdd0d54ebafdd7fa\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\`
            ADD CONSTRAINT \`FK_91942a5962da3b91175eeaa2db1\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD CONSTRAINT \`FK_0786e0bee54b581c62d79a8cec7\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\`
            ADD CONSTRAINT \`FK_410780c372c6b400e9c6cba7433\` FOREIGN KEY (\`client_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\`
            ADD CONSTRAINT \`FK_81f39f6e4a90fc8b861cf12dbf8\` FOREIGN KEY (\`scope_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\`
            ADD CONSTRAINT \`FK_60411456c45c831be656fbf8506\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\`
            ADD CONSTRAINT \`FK_af56e638d28a0cc3139c54e8259\` FOREIGN KEY (\`provider_id\`) REFERENCES \`auth_identity_providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\`
            ADD CONSTRAINT \`FK_58a45697736646499b3dc7f0d0c\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\`
            ADD CONSTRAINT \`FK_c9432656798d6116dd47a896e45\` FOREIGN KEY (\`user_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\`
            ADD CONSTRAINT \`FK_209348829a22e0fb2715e937e44\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\`
            ADD CONSTRAINT \`FK_f59883e2400b294414a495002ab\` FOREIGN KEY (\`permission_id\`) REFERENCES \`auth_permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\`
            ADD CONSTRAINT \`FK_acce12b53121e9eb413f32c719d\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\`
            ADD CONSTRAINT \`FK_b3a2e4610f9162c3dca88a8cc55\` FOREIGN KEY (\`provider_id\`) REFERENCES \`auth_identity_providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\`
            ADD CONSTRAINT \`FK_f2ea716aa0c8bd034b6f28e9eb4\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\`
            ADD CONSTRAINT \`FK_0c89b2c523eee535a9a18422fd0\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\`
            ADD CONSTRAINT \`FK_0c61ae237f6a87d65feed8bc452\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\`
            ADD CONSTRAINT \`FK_e6d52ed7072ab8488806ed648fc\` FOREIGN KEY (\`provider_id\`) REFERENCES \`auth_identity_providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\`
            ADD CONSTRAINT \`FK_f8dfd31c9dc51e1fb8409c83d05\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_tree_closure\`
            ADD CONSTRAINT \`FK_864863312111829a4f4ed664c79\` FOREIGN KEY (\`ancestor_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_tree_closure\`
            ADD CONSTRAINT \`FK_b09663b133807f1207f499d79a0\` FOREIGN KEY (\`descendant_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_tree_closure\` DROP FOREIGN KEY \`FK_b09663b133807f1207f499d79a0\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_tree_closure\` DROP FOREIGN KEY \`FK_864863312111829a4f4ed664c79\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` DROP FOREIGN KEY \`FK_f8dfd31c9dc51e1fb8409c83d05\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` DROP FOREIGN KEY \`FK_e6d52ed7072ab8488806ed648fc\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` DROP FOREIGN KEY \`FK_0c61ae237f6a87d65feed8bc452\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` DROP FOREIGN KEY \`FK_0c89b2c523eee535a9a18422fd0\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` DROP FOREIGN KEY \`FK_f2ea716aa0c8bd034b6f28e9eb4\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` DROP FOREIGN KEY \`FK_b3a2e4610f9162c3dca88a8cc55\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` DROP FOREIGN KEY \`FK_acce12b53121e9eb413f32c719d\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` DROP FOREIGN KEY \`FK_f59883e2400b294414a495002ab\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP FOREIGN KEY \`FK_209348829a22e0fb2715e937e44\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP FOREIGN KEY \`FK_c9432656798d6116dd47a896e45\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\` DROP FOREIGN KEY \`FK_58a45697736646499b3dc7f0d0c\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\` DROP FOREIGN KEY \`FK_af56e638d28a0cc3139c54e8259\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\` DROP FOREIGN KEY \`FK_60411456c45c831be656fbf8506\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP FOREIGN KEY \`FK_81f39f6e4a90fc8b861cf12dbf8\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP FOREIGN KEY \`FK_410780c372c6b400e9c6cba7433\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP FOREIGN KEY \`FK_0786e0bee54b581c62d79a8cec7\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\` DROP FOREIGN KEY \`FK_91942a5962da3b91175eeaa2db1\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_f15efcb7151cdd0d54ebafdd7fa\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_cfa1834ece97297955f4a9539ad\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP FOREIGN KEY \`FK_0d8fb586aa4d177206142bd4ed5\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP FOREIGN KEY \`FK_b669b08267cf6486c7e44a24fb8\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_attributes\` DROP FOREIGN KEY \`FK_8b759199b8a0213a7a0f7b1986a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_attributes\` DROP FOREIGN KEY \`FK_f4cdbb6a56eb93fa2598c8483de\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP FOREIGN KEY \`FK_707089f1df498d1719972e69aef\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP FOREIGN KEY \`FK_43caa964bb178ee4b5a5da7b8a7\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP FOREIGN KEY \`FK_b1797e07106b4af61280b8edac1\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_91942a5962da3b91175eeaa2db\` ON \`auth_robots\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_81e4d79be52485b31ea4afeb54\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0d8fb586aa4d177206142bd4ed\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b1797e07106b4af61280b8edac\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP COLUMN \`provider_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP COLUMN \`user_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\` DROP COLUMN \`realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP COLUMN \`scope_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP COLUMN \`client_realm_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP COLUMN \`policy_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\` DROP COLUMN \`client_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP COLUMN \`policy_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP COLUMN \`policy_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP COLUMN \`client_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP COLUMN \`policy_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP COLUMN \`client_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD \`target\` varchar(16) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD \`power\` int NOT NULL DEFAULT '999'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD \`negation\` tinyint NOT NULL DEFAULT '0'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD \`fields\` text NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\`
            ADD \`condition\` text NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD \`target\` varchar(16) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD \`power\` int NOT NULL DEFAULT '999'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD \`negation\` tinyint NOT NULL DEFAULT '0'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD \`fields\` text NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD \`condition\` text NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD \`target\` varchar(16) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD \`power\` int NOT NULL DEFAULT '999'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD \`negation\` tinyint NOT NULL DEFAULT '0'
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD \`fields\` text NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD \`condition\` text NULL
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b09663b133807f1207f499d79a\` ON \`auth_policy_tree_closure\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_864863312111829a4f4ed664c7\` ON \`auth_policy_tree_closure\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_policy_tree_closure\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_565cc7e3b06db4552002345f75\` ON \`auth_identity_provider_role_mappings\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_identity_provider_role_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_39b28b1e3bcd7a665823f15484\` ON \`auth_identity_provider_permission_mappings\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_identity_provider_permission_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_13759c902e6d063119f556f621\` ON \`auth_identity_provider_attribute_mappings\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_identity_provider_attribute_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3a603f9d26dc5e2de355e6996f\` ON \`auth_policy_attributes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_policy_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f11361718b38c80f6ac7bfd070\` ON \`auth_policies\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_policies\`
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_40a392cb2ddf6b12f841d06a82\` ON \`auth_permissions\` (\`name\`)
        `);
    }
}
