import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1673449341125 implements MigrationInterface {
    name = 'Default1673449341125';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`auth_realms\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`description\` text NULL,
                \`drop_able\` tinyint NOT NULL DEFAULT 1,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_9b95dc8c08d8b11a80a6798a64\` (\`name\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_keys\` (
                \`id\` varchar(36) NOT NULL,
                \`type\` varchar(64) NULL,
                \`priority\` int UNSIGNED NOT NULL DEFAULT '0',
                \`signature_algorithm\` varchar(64) NULL,
                \`decryption_key\` varchar(4096) NULL,
                \`encryption_key\` varchar(4096) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`realm_id\` varchar(255) NULL,
                INDEX \`IDX_fdc78f76d9316352bddfed9165\` (\`type\`),
                INDEX \`IDX_5921107054192639a79fb274b9\` (\`realm_id\`),
                INDEX \`IDX_e38d9d6e8be3d1d6e684b60342\` (\`priority\`, \`realm_id\`, \`type\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_users\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`name_locked\` tinyint NOT NULL DEFAULT 1,
                \`first_name\` varchar(128) NULL,
                \`last_name\` varchar(128) NULL,
                \`display_name\` varchar(128) NOT NULL,
                \`email\` varchar(256) NULL,
                \`password\` varchar(512) NULL,
                \`avatar\` varchar(255) NULL,
                \`cover\` varchar(255) NULL,
                \`reset_hash\` varchar(256) NULL,
                \`reset_at\` varchar(28) NULL,
                \`reset_expires\` varchar(28) NULL,
                \`status\` varchar(256) NULL,
                \`status_message\` varchar(256) NULL,
                \`active\` tinyint NOT NULL DEFAULT 1,
                \`activate_hash\` varchar(256) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`realm_id\` varchar(255) NOT NULL,
                INDEX \`IDX_2d54113aa2edfc3955abcf524a\` (\`name\`),
                INDEX \`IDX_13d8b49e55a8b06bee6bbc828f\` (\`email\`),
                INDEX \`IDX_1d5fcbfcbba74381ca8a58a3f1\` (\`realm_id\`),
                UNIQUE INDEX \`IDX_7e0d8fa52a9921d445798c2bb7\` (\`name\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_roles\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(64) NOT NULL,
                \`target\` varchar(16) NULL,
                \`description\` text NULL,
                \`realm_id\` varchar(255) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_063e4bd5b708c304b51b7ee774\` (\`realm_id\`),
                UNIQUE INDEX \`IDX_dce62a3739791bb4fb2fb5c137\` (\`name\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_permissions\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`built_in\` tinyint NOT NULL DEFAULT 0,
                \`description\` text NULL,
                \`target\` varchar(16) NULL,
                \`realm_id\` varchar(255) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_9356935453c5e442d375531ee5\` (\`realm_id\`),
                UNIQUE INDEX \`IDX_40a392cb2ddf6b12f841d06a82\` (\`name\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_role_permissions\` (
                \`id\` varchar(36) NOT NULL,
                \`power\` int NOT NULL DEFAULT '999',
                \`condition\` text NULL,
                \`fields\` text NULL,
                \`negation\` tinyint NOT NULL DEFAULT 0,
                \`target\` varchar(16) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`role_id\` varchar(255) NOT NULL,
                \`role_realm_id\` varchar(255) NULL,
                \`permission_id\` varchar(255) NOT NULL,
                \`permission_realm_id\` varchar(255) NULL,
                UNIQUE INDEX \`IDX_40c0ee0929b20575df125e8d14\` (\`permission_id\`, \`role_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_user_roles\` (
                \`id\` varchar(36) NOT NULL,
                \`role_id\` varchar(255) NOT NULL,
                \`role_realm_id\` varchar(255) NULL,
                \`user_id\` varchar(255) NOT NULL,
                \`user_realm_id\` varchar(255) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_e1aaaa657b3c0615f6b4a6e657\` (\`role_id\`, \`user_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_user_permissions\` (
                \`id\` varchar(36) NOT NULL,
                \`power\` int NOT NULL DEFAULT '999',
                \`condition\` text NULL,
                \`fields\` text NULL,
                \`negation\` tinyint NOT NULL DEFAULT 0,
                \`target\` varchar(16) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`user_id\` varchar(255) NOT NULL,
                \`user_realm_id\` varchar(255) NULL,
                \`permission_id\` varchar(255) NOT NULL,
                \`permission_realm_id\` varchar(255) NULL,
                UNIQUE INDEX \`IDX_e1a21fc2e6ac12fa29b02c4382\` (\`permission_id\`, \`user_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_user_attributes\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`value\` text NULL,
                \`realm_id\` varchar(255) NOT NULL,
                \`user_id\` varchar(255) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_b748c46e233d86287b63b49d09\` (\`name\`, \`user_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
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
                INDEX \`IDX_9c99802f3f360718344180c3f6\` (\`realm_id\`),
                UNIQUE INDEX \`IDX_f89cc2abf1d7e284a7d6cd59c1\` (\`name\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
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
                \`power\` int NOT NULL DEFAULT '999',
                \`condition\` text NULL,
                \`fields\` text NULL,
                \`negation\` tinyint NOT NULL DEFAULT 0,
                \`target\` varchar(16) NULL,
                \`robot_id\` varchar(255) NOT NULL,
                \`robot_realm_id\` varchar(255) NULL,
                \`permission_id\` varchar(255) NOT NULL,
                \`permission_realm_id\` varchar(255) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_0c2284272043ed8aba6689306b\` (\`permission_id\`, \`robot_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_clients\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(256) NOT NULL,
                \`description\` text NULL,
                \`secret\` varchar(256) NULL,
                \`redirect_uri\` text NULL,
                \`grant_types\` varchar(512) NULL,
                \`scope\` varchar(512) NULL,
                \`base_url\` varchar(2000) NULL,
                \`root_url\` varchar(2000) NULL,
                \`is_confidential\` tinyint NOT NULL DEFAULT 0,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`realm_id\` varchar(255) NULL,
                \`user_id\` varchar(255) NULL,
                UNIQUE INDEX \`IDX_6018b722f28f1cc6fdac450e61\` (\`name\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_authorization_codes\` (
                \`id\` varchar(36) NOT NULL,
                \`content\` varchar(4096) NOT NULL,
                \`expires\` varchar(28) NOT NULL,
                \`scope\` varchar(512) NULL,
                \`redirect_uri\` varchar(2000) NULL,
                \`id_token\` varchar(1000) NULL,
                \`client_id\` varchar(255) NULL,
                \`user_id\` varchar(255) NULL,
                \`robot_id\` varchar(255) NULL,
                \`realm_id\` varchar(255) NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_scopes\` (
                \`id\` varchar(36) NOT NULL,
                \`built_in\` tinyint NOT NULL DEFAULT 0,
                \`name\` varchar(128) NOT NULL,
                \`description\` text NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`realm_id\` varchar(255) NULL,
                UNIQUE INDEX \`IDX_b14fab23784a81c282abef41fa\` (\`name\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_client_scopes\` (
                \`id\` varchar(36) NOT NULL,
                \`default\` tinyint NOT NULL DEFAULT 0,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`client_id\` varchar(255) NOT NULL,
                \`scope_id\` varchar(255) NOT NULL,
                UNIQUE INDEX \`IDX_ddec4250b145536333f137ff96\` (\`client_id\`, \`scope_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_identity_providers\` (
                \`id\` varchar(36) NOT NULL,
                \`slug\` varchar(36) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`protocol\` varchar(64) NOT NULL,
                \`protocol_config\` varchar(64) NULL,
                \`enabled\` tinyint NOT NULL DEFAULT 1,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`realm_id\` varchar(255) NOT NULL,
                UNIQUE INDEX \`IDX_3752f24587d0405c13f5a790da\` (\`slug\`, \`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_identity_provider_attributes\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`value\` text NULL,
                \`provider_id\` varchar(255) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_994a26636cc20da801d5ef4ee4\` (\`name\`, \`provider_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_identity_provider_accounts\` (
                \`id\` varchar(36) NOT NULL,
                \`access_token\` text NULL,
                \`refresh_token\` text NULL,
                \`provider_user_id\` varchar(256) NOT NULL,
                \`provider_user_name\` varchar(256) NULL,
                \`provider_user_email\` varchar(512) NULL,
                \`expires_in\` int UNSIGNED NULL,
                \`expires_at\` varchar(28) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`user_id\` varchar(255) NOT NULL,
                \`provider_id\` varchar(255) NOT NULL,
                UNIQUE INDEX \`IDX_96a230c697b83505e073713507\` (\`provider_id\`, \`user_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_identity_provider_roles\` (
                \`id\` varchar(36) NOT NULL,
                \`external_id\` varchar(36) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`role_id\` varchar(255) NOT NULL,
                \`role_realm_id\` varchar(255) NULL,
                \`provider_id\` varchar(255) NOT NULL,
                \`provider_realm_id\` varchar(255) NULL,
                UNIQUE INDEX \`IDX_42df2e30eee05e54c74bced78b\` (\`provider_id\`, \`external_id\`),
                UNIQUE INDEX \`IDX_fadb9ce4df580cc42e78b74b2f\` (\`provider_id\`, \`role_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_refresh_tokens\` (
                \`id\` varchar(36) NOT NULL,
                \`expires\` varchar(28) NOT NULL,
                \`scope\` varchar(512) NULL,
                \`access_token\` varchar(255) NULL,
                \`client_id\` varchar(255) NULL,
                \`user_id\` varchar(255) NULL,
                \`robot_id\` varchar(255) NULL,
                \`realm_id\` varchar(255) NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_role_attributes\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`value\` text NULL,
                \`realm_id\` varchar(255) NULL,
                \`role_id\` varchar(255) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_aabe997ae70f617cb5479ed8d8\` (\`name\`, \`role_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\`
            ADD CONSTRAINT \`FK_5921107054192639a79fb274b91\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD CONSTRAINT \`FK_1d5fcbfcbba74381ca8a58a3f17\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD CONSTRAINT \`FK_063e4bd5b708c304b51b7ee7743\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD CONSTRAINT \`FK_9356935453c5e442d375531ee52\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD CONSTRAINT \`FK_3a6789765734cf5f3f555f2098f\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD CONSTRAINT \`FK_3d29528c774bc47404659fad030\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD CONSTRAINT \`FK_4bbe0c540b241ca21e4bd1d8d12\` FOREIGN KEY (\`permission_id\`) REFERENCES \`auth_permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\`
            ADD CONSTRAINT \`FK_f9ab8919ff5d5993816f6881879\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\`
            ADD CONSTRAINT \`FK_866cd5c92b05353aab240bdc10a\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\`
            ADD CONSTRAINT \`FK_77fe9d38c984c640fc155503c4f\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\`
            ADD CONSTRAINT \`FK_a3a59104c9c9f2a2458972bc96d\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\`
            ADD CONSTRAINT \`FK_6161ccebf3af1c475758651de49\` FOREIGN KEY (\`user_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD CONSTRAINT \`FK_c1d4523b08aa27f07dff798f8d6\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD CONSTRAINT \`FK_5bf6d1affe0575299c44bc58c06\` FOREIGN KEY (\`user_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD CONSTRAINT \`FK_cf962d70634dedf7812fc28282a\` FOREIGN KEY (\`permission_id\`) REFERENCES \`auth_permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\`
            ADD CONSTRAINT \`FK_e2de70574303693fea386cc0edd\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_attributes\`
            ADD CONSTRAINT \`FK_9a84db5a27d34b31644b54d9106\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_attributes\`
            ADD CONSTRAINT \`FK_f50fe4004312e972a547c0e945e\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
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
            ALTER TABLE \`auth_clients\`
            ADD CONSTRAINT \`FK_b628ffa1b2f5415598cfb1a72af\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD CONSTRAINT \`FK_9c9f985a5cfc1ff52a04c05e5d5\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\`
            ADD CONSTRAINT \`FK_ff6e597e9dd296da510efc06d28\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\`
            ADD CONSTRAINT \`FK_5119ffb8f6b8ba853e52be2e417\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\`
            ADD CONSTRAINT \`FK_32619f36922f433e27affc169e4\` FOREIGN KEY (\`robot_id\`) REFERENCES \`auth_robots\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\`
            ADD CONSTRAINT \`FK_343b25488aef1b87f4771f8c7eb\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_scopes\`
            ADD CONSTRAINT \`FK_69e83c8e7e11a247a0809eb3327\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\`
            ADD CONSTRAINT \`FK_6331374fa74645dae2d52547081\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\`
            ADD CONSTRAINT \`FK_471f3da9df80f92c382a586e9ca\` FOREIGN KEY (\`scope_id\`) REFERENCES \`auth_scopes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\`
            ADD CONSTRAINT \`FK_00fd737c365d688f9edd0c73eca\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\`
            ADD CONSTRAINT \`FK_5ac40c5ce92142639df65a33e53\` FOREIGN KEY (\`provider_id\`) REFERENCES \`auth_identity_providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\`
            ADD CONSTRAINT \`FK_b07582d2705a04c2e868e6c3742\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\`
            ADD CONSTRAINT \`FK_a82bbdf79b8accbfe71326dce00\` FOREIGN KEY (\`provider_id\`) REFERENCES \`auth_identity_providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\`
            ADD CONSTRAINT \`FK_f32f792ca1aeacea0507ef80a11\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\`
            ADD CONSTRAINT \`FK_2c3139bd232ffde35b71d43018e\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\`
            ADD CONSTRAINT \`FK_52a568200844cde16722b9bb95e\` FOREIGN KEY (\`provider_id\`) REFERENCES \`auth_identity_providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\`
            ADD CONSTRAINT \`FK_d49fb54b140869696a5a14285c7\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\`
            ADD CONSTRAINT \`FK_8f611e7ff67a2b013c909f60d52\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\`
            ADD CONSTRAINT \`FK_f795ad14f31838e3ddc663ee150\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\`
            ADD CONSTRAINT \`FK_6be38b6dbd4ce86ca3d17494ca9\` FOREIGN KEY (\`robot_id\`) REFERENCES \`auth_robots\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\`
            ADD CONSTRAINT \`FK_c1f59fdabbcf5dfd74d6af7f400\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_attributes\`
            ADD CONSTRAINT \`FK_2ba00548c512fffe2e5bf4bb3ff\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_attributes\`
            ADD CONSTRAINT \`FK_cd014be6be330f64b8405d0c72a\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_role_attributes\` DROP FOREIGN KEY \`FK_cd014be6be330f64b8405d0c72a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_attributes\` DROP FOREIGN KEY \`FK_2ba00548c512fffe2e5bf4bb3ff\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\` DROP FOREIGN KEY \`FK_c1f59fdabbcf5dfd74d6af7f400\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\` DROP FOREIGN KEY \`FK_6be38b6dbd4ce86ca3d17494ca9\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\` DROP FOREIGN KEY \`FK_f795ad14f31838e3ddc663ee150\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\` DROP FOREIGN KEY \`FK_8f611e7ff67a2b013c909f60d52\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\` DROP FOREIGN KEY \`FK_d49fb54b140869696a5a14285c7\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\` DROP FOREIGN KEY \`FK_52a568200844cde16722b9bb95e\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\` DROP FOREIGN KEY \`FK_2c3139bd232ffde35b71d43018e\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\` DROP FOREIGN KEY \`FK_f32f792ca1aeacea0507ef80a11\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP FOREIGN KEY \`FK_a82bbdf79b8accbfe71326dce00\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP FOREIGN KEY \`FK_b07582d2705a04c2e868e6c3742\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\` DROP FOREIGN KEY \`FK_5ac40c5ce92142639df65a33e53\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\` DROP FOREIGN KEY \`FK_00fd737c365d688f9edd0c73eca\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP FOREIGN KEY \`FK_471f3da9df80f92c382a586e9ca\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP FOREIGN KEY \`FK_6331374fa74645dae2d52547081\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_scopes\` DROP FOREIGN KEY \`FK_69e83c8e7e11a247a0809eb3327\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\` DROP FOREIGN KEY \`FK_343b25488aef1b87f4771f8c7eb\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\` DROP FOREIGN KEY \`FK_32619f36922f433e27affc169e4\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\` DROP FOREIGN KEY \`FK_5119ffb8f6b8ba853e52be2e417\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\` DROP FOREIGN KEY \`FK_ff6e597e9dd296da510efc06d28\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_9c9f985a5cfc1ff52a04c05e5d5\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_b628ffa1b2f5415598cfb1a72af\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP FOREIGN KEY \`FK_1cacb8af1791a5303d30cbf8590\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP FOREIGN KEY \`FK_b29fe901137f6944ecaf98fcb5a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP FOREIGN KEY \`FK_d52ab826ee04e008624df74cdc8\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_permissions\` DROP FOREIGN KEY \`FK_5af2884572a617e2532410f8221\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_roles\` DROP FOREIGN KEY \`FK_21994ec834c710276cce38c779d\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_roles\` DROP FOREIGN KEY \`FK_a4904e9c921294c80f75a0c3e02\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_roles\` DROP FOREIGN KEY \`FK_28146c7babddcad18116dabfa9e\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robot_roles\` DROP FOREIGN KEY \`FK_2256b04cbdb1e16e5144e14750b\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\` DROP FOREIGN KEY \`FK_9c99802f3f360718344180c3f68\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_robots\` DROP FOREIGN KEY \`FK_b6d73e3026e15c0af6c41ef8139\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_attributes\` DROP FOREIGN KEY \`FK_f50fe4004312e972a547c0e945e\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_attributes\` DROP FOREIGN KEY \`FK_9a84db5a27d34b31644b54d9106\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_e2de70574303693fea386cc0edd\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_cf962d70634dedf7812fc28282a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_5bf6d1affe0575299c44bc58c06\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_c1d4523b08aa27f07dff798f8d6\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` DROP FOREIGN KEY \`FK_6161ccebf3af1c475758651de49\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` DROP FOREIGN KEY \`FK_a3a59104c9c9f2a2458972bc96d\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` DROP FOREIGN KEY \`FK_77fe9d38c984c640fc155503c4f\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` DROP FOREIGN KEY \`FK_866cd5c92b05353aab240bdc10a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_f9ab8919ff5d5993816f6881879\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_4bbe0c540b241ca21e4bd1d8d12\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_3d29528c774bc47404659fad030\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_3a6789765734cf5f3f555f2098f\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP FOREIGN KEY \`FK_9356935453c5e442d375531ee52\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP FOREIGN KEY \`FK_063e4bd5b708c304b51b7ee7743\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP FOREIGN KEY \`FK_1d5fcbfcbba74381ca8a58a3f17\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_keys\` DROP FOREIGN KEY \`FK_5921107054192639a79fb274b91\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_aabe997ae70f617cb5479ed8d8\` ON \`auth_role_attributes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_role_attributes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_refresh_tokens\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_fadb9ce4df580cc42e78b74b2f\` ON \`auth_identity_provider_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_42df2e30eee05e54c74bced78b\` ON \`auth_identity_provider_roles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_identity_provider_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_96a230c697b83505e073713507\` ON \`auth_identity_provider_accounts\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_identity_provider_accounts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_994a26636cc20da801d5ef4ee4\` ON \`auth_identity_provider_attributes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_identity_provider_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3752f24587d0405c13f5a790da\` ON \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_ddec4250b145536333f137ff96\` ON \`auth_client_scopes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_client_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b14fab23784a81c282abef41fa\` ON \`auth_scopes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_scopes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_authorization_codes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6018b722f28f1cc6fdac450e61\` ON \`auth_clients\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_clients\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0c2284272043ed8aba6689306b\` ON \`auth_robot_permissions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_robot_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_515b3dc84ba9bec42bd0e92cbd\` ON \`auth_robot_roles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_robot_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f89cc2abf1d7e284a7d6cd59c1\` ON \`auth_robots\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9c99802f3f360718344180c3f6\` ON \`auth_robots\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_robots\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b748c46e233d86287b63b49d09\` ON \`auth_user_attributes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_user_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e1a21fc2e6ac12fa29b02c4382\` ON \`auth_user_permissions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_user_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e1aaaa657b3c0615f6b4a6e657\` ON \`auth_user_roles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_user_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_40c0ee0929b20575df125e8d14\` ON \`auth_role_permissions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_role_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_40a392cb2ddf6b12f841d06a82\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9356935453c5e442d375531ee5\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_dce62a3739791bb4fb2fb5c137\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_063e4bd5b708c304b51b7ee774\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_7e0d8fa52a9921d445798c2bb7\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_1d5fcbfcbba74381ca8a58a3f1\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_13d8b49e55a8b06bee6bbc828f\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_2d54113aa2edfc3955abcf524a\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e38d9d6e8be3d1d6e684b60342\` ON \`auth_keys\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5921107054192639a79fb274b9\` ON \`auth_keys\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_fdc78f76d9316352bddfed9165\` ON \`auth_keys\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_keys\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9b95dc8c08d8b11a80a6798a64\` ON \`auth_realms\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_realms\`
        `);
    }
}
