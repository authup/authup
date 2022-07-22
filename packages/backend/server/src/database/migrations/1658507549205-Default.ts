import { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1658507549205 implements MigrationInterface {
    name = 'Default1658507549205';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "auth_clients"
        `);

        await queryRunner.query(`
            DROP TABLE "auth_access_tokens"
        `);

        await queryRunner.query(`
            DROP TABLE "auth_refresh_tokens"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }
}
