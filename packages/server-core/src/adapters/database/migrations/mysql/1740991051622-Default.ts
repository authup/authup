import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1740991051622 implements MigrationInterface {
    name = 'Default1740991051622';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP FOREIGN KEY \`FK_43caa964bb178ee4b5a5da7b8a7\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_81e4d79be52485b31ea4afeb54\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_dce62a3739791bb4fb2fb5c137\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3752f24587d0405c13f5a790da\` ON \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` CHANGE \`parentId\` \`parent_id\` varchar(36) NULL
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_client_permissions\` (
                \`id\` varchar(36) NOT NULL,
                \`policy_id\` varchar(255) NULL,
                \`client_id\` varchar(255) NOT NULL,
                \`client_realm_id\` varchar(255) NULL,
                \`permission_id\` varchar(255) NOT NULL,
                \`permission_realm_id\` varchar(255) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_3ccaff24ccf92dcd528dab81ef\` (\`client_id\`, \`permission_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_client_roles\` (
                \`id\` varchar(36) NOT NULL,
                \`role_id\` varchar(255) NOT NULL,
                \`role_realm_id\` varchar(255) NULL,
                \`client_id\` varchar(255) NOT NULL,
                \`client_realm_id\` varchar(255) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_2b1afa844bfc6635f92be68375\` (\`role_id\`, \`client_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\` DROP COLUMN \`slug\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD \`client_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
                MODIFY \`parent_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            MODIFY \`name\` varchar(128) NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_707089f1df498d1719972e69ae\` ON \`auth_policies\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_561d1b8a5a7db602df418d7cd5\` ON \`auth_permissions\` (\`name\`, \`client_id\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_8f460e65af897b9b049f582ad0\` ON \`auth_roles\` (\`client_id\`)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_5456fbd03999de8005f6bb88bd\` ON \`auth_roles\` (\`name\`, \`client_id\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_69e83c8e7e11a247a0809eb332\` ON \`auth_scopes\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_00fd737c365d688f9edd0c73ec\` ON \`auth_identity_providers\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_ab9dccd698d40bc1ea0938c1dd\` ON \`auth_identity_providers\` (\`name\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD CONSTRAINT \`FK_14b3b3b9c0a1b3a1d2abecb6e72\` FOREIGN KEY (\`parent_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD CONSTRAINT \`FK_8f460e65af897b9b049f582ad0e\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\`
            ADD CONSTRAINT \`FK_d677e1082c27aae4ede40db0e97\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\`
            ADD CONSTRAINT \`FK_f110581fbc4bb7e6cb2140a854a\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\`
            ADD CONSTRAINT \`FK_b27b823c96287617e5bdf008ea8\` FOREIGN KEY (\`client_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\`
            ADD CONSTRAINT \`FK_feb56f67d0c919e7626f1df8367\` FOREIGN KEY (\`permission_id\`) REFERENCES \`auth_permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\`
            ADD CONSTRAINT \`FK_0d08f64ff34cb0d19deff4b1fc9\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\`
            ADD CONSTRAINT \`FK_4fbf55515c1520be753cb84cb3c\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\`
            ADD CONSTRAINT \`FK_dbcfb3a6d68ad40775ff55b0fd3\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\`
            ADD CONSTRAINT \`FK_f88e0dfb5f8c30fc66fef320f63\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\`
            ADD CONSTRAINT \`FK_3a3a792dbd6d343c0dabe9900a3\` FOREIGN KEY (\`client_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` DROP FOREIGN KEY \`FK_3a3a792dbd6d343c0dabe9900a3\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` DROP FOREIGN KEY \`FK_f88e0dfb5f8c30fc66fef320f63\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` DROP FOREIGN KEY \`FK_dbcfb3a6d68ad40775ff55b0fd3\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` DROP FOREIGN KEY \`FK_4fbf55515c1520be753cb84cb3c\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_0d08f64ff34cb0d19deff4b1fc9\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_feb56f67d0c919e7626f1df8367\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_b27b823c96287617e5bdf008ea8\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_f110581fbc4bb7e6cb2140a854a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_d677e1082c27aae4ede40db0e97\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP FOREIGN KEY \`FK_8f460e65af897b9b049f582ad0e\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP FOREIGN KEY \`FK_14b3b3b9c0a1b3a1d2abecb6e72\`
        `);

        // create & drop foreign key: realm_id
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\` DROP FOREIGN KEY \`FK_00fd737c365d688f9edd0c73eca\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_ab9dccd698d40bc1ea0938c1dd\` ON \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_00fd737c365d688f9edd0c73ec\` ON \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\`
            ADD CONSTRAINT \`FK_00fd737c365d688f9edd0c73eca\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // create & drop foreign key: realm_id
        await queryRunner.query('ALTER TABLE `auth_scopes` DROP FOREIGN KEY `FK_69e83c8e7e11a247a0809eb3327`');
        await queryRunner.query(`
            DROP INDEX \`IDX_69e83c8e7e11a247a0809eb332\` ON \`auth_scopes\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_scopes\`
                ADD CONSTRAINT \`FK_69e83c8e7e11a247a0809eb3327\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            DROP INDEX \`IDX_5456fbd03999de8005f6bb88bd\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_8f460e65af897b9b049f582ad0\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_561d1b8a5a7db602df418d7cd5\` ON \`auth_permissions\`
        `);

        // create & drop foreign key: realm_id
        await queryRunner.query('ALTER TABLE `auth_policies` DROP FOREIGN KEY `FK_707089f1df498d1719972e69aef`');
        await queryRunner.query(`
            DROP INDEX \`IDX_707089f1df498d1719972e69ae\` ON \`auth_policies\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
                ADD CONSTRAINT \`FK_707089f1df498d1719972e69aef\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            MODIFY \`name\` varchar(64) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
                MODIFY \`parent_id\` varchar (36) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP COLUMN \`client_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_providers\`
            ADD \`slug\` varchar(36) NULL
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_2b1afa844bfc6635f92be68375\` ON \`auth_client_roles\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_client_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3ccaff24ccf92dcd528dab81ef\` ON \`auth_client_permissions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_client_permissions\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` CHANGE \`parent_id\` \`parentId\` varchar(36) NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_3752f24587d0405c13f5a790da\` ON \`auth_identity_providers\` (\`slug\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_dce62a3739791bb4fb2fb5c137\` ON \`auth_roles\` (\`name\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_81e4d79be52485b31ea4afeb54\` ON \`auth_permissions\` (\`name\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\`
            ADD CONSTRAINT \`FK_43caa964bb178ee4b5a5da7b8a7\` FOREIGN KEY (\`parentId\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }
}
