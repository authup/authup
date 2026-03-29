import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1774800953474 implements MigrationInterface {
    name = 'Default1774800953474';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
                RENAME COLUMN "policy_id" TO "decision_strategy"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_permission_policies" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "permission_id" uuid NOT NULL,
                "permission_realm_id" uuid,
                "policy_id" uuid NOT NULL,
                "policy_realm_id" uuid,
                CONSTRAINT "PK_f99fb313ce4a7246530c9931bfb" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_41ab2228f1cb7778aced673014" ON "auth_permission_policies" ("permission_id", "policy_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP COLUMN "decision_strategy"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD "decision_strategy" character varying(50)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permission_policies"
            ADD CONSTRAINT "FK_f49282ed769970070b9d5df30f3" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permission_policies"
            ADD CONSTRAINT "FK_babb340dda101f2df8334eea5c9" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permission_policies"
            ADD CONSTRAINT "FK_f5225aa8083c99b1cd09f4390c7" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permission_policies"
            ADD CONSTRAINT "FK_a76f5f6a12317ea0e24a84c1a5b" FOREIGN KEY ("policy_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_permission_policies" DROP CONSTRAINT "FK_a76f5f6a12317ea0e24a84c1a5b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permission_policies" DROP CONSTRAINT "FK_f5225aa8083c99b1cd09f4390c7"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permission_policies" DROP CONSTRAINT "FK_babb340dda101f2df8334eea5c9"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permission_policies" DROP CONSTRAINT "FK_f49282ed769970070b9d5df30f3"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP COLUMN "decision_strategy"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD "decision_strategy" uuid
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_41ab2228f1cb7778aced673014"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_permission_policies"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
                RENAME COLUMN "decision_strategy" TO "policy_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }
}
