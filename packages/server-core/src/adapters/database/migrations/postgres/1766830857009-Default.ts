import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1766830857009 implements MigrationInterface {
    name = 'Default1766830857009';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users" DROP CONSTRAINT "FK_b1797e07106b4af61280b8edac1"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sub" character varying(64) NOT NULL,
                "sub_kind" character varying(64) NOT NULL,
                "ip_address" character varying(15) NOT NULL,
                "user_agent" character varying(512) NOT NULL,
                "expires_at" character varying(28) NOT NULL,
                "refreshed_at" character varying(28),
                "seen_at" character varying(28),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "client_id" uuid,
                "user_id" uuid,
                "robot_id" uuid,
                "realm_id" uuid NOT NULL,
                CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a83763bae0948e46c0c128a3c4" ON "auth_sessions" ("sub")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_00a5096d599ad839dee7385f4e" ON "auth_sessions" ("sub_kind")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_514d063fddd0ce969e7b8881c5" ON "auth_sessions" ("ip_address")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_717d1d5d49af59b84a3c70281f" ON "auth_sessions" ("user_agent")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "user_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP COLUMN "target"
        `);

        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
                RENAME COLUMN "source_value_is_regex" TO "value_is_regex"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
                RENAME COLUMN "source_name" TO "name"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
                RENAME COLUMN "source_value" TO "value"
        `);

        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD "active" boolean NOT NULL DEFAULT true
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD "secret_hashed" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD "secret_encrypted" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
            ADD "value" character varying(128)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
            ADD "value_is_regex" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ALTER COLUMN "realm_id"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
            ALTER COLUMN "email"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
            ADD CONSTRAINT "FK_b1797e07106b4af61280b8edac1" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions"
            ADD CONSTRAINT "FK_4b428fb760524b6ef45e7c2cbff" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions"
            ADD CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions"
            ADD CONSTRAINT "FK_46b30e5d8e5d5de58d454f53f8c" FOREIGN KEY ("robot_id") REFERENCES "auth_robots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions"
            ADD CONSTRAINT "FK_5a40fe23cbb002e73bf740715f5" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_5a40fe23cbb002e73bf740715f5"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_46b30e5d8e5d5de58d454f53f8c"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_4b428fb760524b6ef45e7c2cbff"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users" DROP CONSTRAINT "FK_b1797e07106b4af61280b8edac1"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
            ALTER COLUMN "email" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ALTER COLUMN "realm_id" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "secret_encrypted"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "secret_hashed"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP COLUMN "active"
        `);

        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
                RENAME COLUMN "value_is_regex" TO "source_value_is_regex"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
                RENAME COLUMN "name" TO "source_name"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
                RENAME COLUMN "value" TO "source_value"
        `);

        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD "target" character varying(16)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD "user_id" uuid
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_717d1d5d49af59b84a3c70281f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_514d063fddd0ce969e7b8881c5"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_00a5096d599ad839dee7385f4e"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a83763bae0948e46c0c128a3c4"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_sessions"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
            ADD CONSTRAINT "FK_b1797e07106b4af61280b8edac1" FOREIGN KEY ("client_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }
}
