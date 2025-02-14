import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1739484197959 implements MigrationInterface {
    name = 'Default1739484197959';

    public async up(queryRunner: QueryRunner): Promise<void> {
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
    }
}
