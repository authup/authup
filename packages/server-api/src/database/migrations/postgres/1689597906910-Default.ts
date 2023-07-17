import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1689597906910 implements MigrationInterface {
    name = 'Default1689597906910';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_realms"
                RENAME COLUMN "drop_able" TO "built_in"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers" DROP COLUMN "protocol_config"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
            ADD "preset" character varying(64)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
            ALTER COLUMN "protocol" DROP NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
            ALTER COLUMN "protocol"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers" DROP COLUMN "preset"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
            ADD "protocol_config" character varying(64)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_realms"
                RENAME COLUMN "built_in" TO "drop_able"
        `);
    }
}
