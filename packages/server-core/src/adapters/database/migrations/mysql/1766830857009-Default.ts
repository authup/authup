import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1766830857009 implements MigrationInterface {
    name = 'Default1766830857009';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_9c9f985a5cfc1ff52a04c05e5d5\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP FOREIGN KEY \`FK_0d8fb586aa4d177206142bd4ed5\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP FOREIGN KEY \`FK_b1797e07106b4af61280b8edac1\`
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_sessions\` (
                \`id\` varchar(36) NOT NULL,
                \`sub\` varchar(64) NOT NULL,
                \`sub_kind\` varchar(64) NOT NULL,
                \`ip_address\` varchar(15) NOT NULL,
                \`user_agent\` varchar(512) NOT NULL,
                \`expires_at\` varchar(28) NOT NULL,
                \`refreshed_at\` varchar(28) NULL,
                \`seen_at\` varchar(28) NULL,
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`client_id\` varchar(255) NULL,
                \`user_id\` varchar(255) NULL,
                \`robot_id\` varchar(255) NULL,
                \`realm_id\` varchar(255) NOT NULL,
                INDEX \`IDX_a83763bae0948e46c0c128a3c4\` (\`sub\`),
                INDEX \`IDX_00a5096d599ad839dee7385f4e\` (\`sub_kind\`),
                INDEX \`IDX_514d063fddd0ce969e7b8881c5\` (\`ip_address\`),
                INDEX \`IDX_717d1d5d49af59b84a3c70281f\` (\`user_agent\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`user_id\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP COLUMN \`target\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\`
                RENAME COLUMN \`source_value_is_regex\` TO \`value_is_regex\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\`
                RENAME COLUMN \`source_name\` TO \`name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\`
                RENAME COLUMN \`source_value\` TO \`value\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`active\` tinyint NOT NULL DEFAULT 1
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`secret_hashed\` tinyint NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`secret_encrypted\` tinyint NOT NULL DEFAULT 0
        `);

        // client realm_id not null
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_b628ffa1b2f5415598cfb1a72af\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6018b722f28f1cc6fdac450e61\` ON \`auth_clients\`
        `);
        await queryRunner.query(`
            DELETE FROM \`auth_clients\`
            WHERE \`realm_id\` IS NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` CHANGE \`realm_id\` \`realm_id\` varchar(255) NOT NULL
        `);

        // user email not null
        await queryRunner.query(`
            UPDATE \`auth_users\`
            SET \`email\` = CONCAT(\`name\`, '@example.com')
            WHERE \`email\` IS NULL;
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` CHANGE \`email\` \`email\` varchar(256) NOT NULL
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_6018b722f28f1cc6fdac450e61\` ON \`auth_clients\` (\`name\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD CONSTRAINT \`FK_b628ffa1b2f5415598cfb1a72af\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD CONSTRAINT \`FK_0d8fb586aa4d177206142bd4ed5\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD CONSTRAINT \`FK_b1797e07106b4af61280b8edac1\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD CONSTRAINT \`FK_4b428fb760524b6ef45e7c2cbff\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD CONSTRAINT \`FK_50ccaa6440288a06f0ba693ccc6\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD CONSTRAINT \`FK_46b30e5d8e5d5de58d454f53f8c\` FOREIGN KEY (\`robot_id\`) REFERENCES \`auth_robots\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD CONSTRAINT \`FK_5a40fe23cbb002e73bf740715f5\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_5a40fe23cbb002e73bf740715f5\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_46b30e5d8e5d5de58d454f53f8c\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_50ccaa6440288a06f0ba693ccc6\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_4b428fb760524b6ef45e7c2cbff\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` DROP FOREIGN KEY \`FK_b1797e07106b4af61280b8edac1\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\` DROP FOREIGN KEY \`FK_0d8fb586aa4d177206142bd4ed5\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_b628ffa1b2f5415598cfb1a72af\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6018b722f28f1cc6fdac450e61\` ON \`auth_clients\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\` CHANGE \`email\` \`email\` varchar(256) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` CHANGE \`realm_id\` \`realm_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`IDX_6018b722f28f1cc6fdac450e61\` ON \`auth_clients\` (\`name\`, \`realm_id\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD CONSTRAINT \`FK_b628ffa1b2f5415598cfb1a72af\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`secret_encrypted\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`secret_hashed\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP COLUMN \`active\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\`
                RENAME COLUMN \`value_is_regex\` TO \`source_value_is_regex\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\`
                RENAME COLUMN \`name\` TO \`source_name\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\`
                RENAME COLUMN \`value\` TO \`source_value\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD \`target\` varchar(16) NULL
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD \`user_id\` varchar(255) NULL
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_717d1d5d49af59b84a3c70281f\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_514d063fddd0ce969e7b8881c5\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_00a5096d599ad839dee7385f4e\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a83763bae0948e46c0c128a3c4\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_sessions\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_users\`
            ADD CONSTRAINT \`FK_b1797e07106b4af61280b8edac1\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permissions\`
            ADD CONSTRAINT \`FK_0d8fb586aa4d177206142bd4ed5\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\`
            ADD CONSTRAINT \`FK_9c9f985a5cfc1ff52a04c05e5d5\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }
}
