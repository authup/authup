import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1718265784562 implements MigrationInterface {
    name = 'Default1718265784562';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_policies" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" character varying(64) NOT NULL,
                "name" character varying(128) NOT NULL,
                "description" text,
                "invert" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "realm_id" uuid NOT NULL,
                "parentId" uuid,
                CONSTRAINT "UQ_f11361718b38c80f6ac7bfd0704" UNIQUE ("name", "realm_id"),
                CONSTRAINT "PK_4605734940b0a8e0375abd80b8b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_policy_attributes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "value" text,
                "policy_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_3a603f9d26dc5e2de355e6996fe" UNIQUE ("name", "policy_id"),
                CONSTRAINT "PK_cef6b7f44cf55a398627a933538" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_attribute_mappings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "synchronization_mode" character varying(64),
                "source_name" character varying(64),
                "source_value" character varying(128),
                "source_value_is_regex" boolean NOT NULL DEFAULT false,
                "target_name" character varying(64) NOT NULL,
                "target_value" character varying(128),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "provider_id" uuid NOT NULL,
                "provider_realm_id" uuid,
                CONSTRAINT "PK_baac9bd50f0e95562bbf66c212a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_13759c902e6d063119f556f621" ON "auth_identity_provider_attribute_mappings" ("provider_id", "target_name")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_role_mappings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "synchronization_mode" character varying(64),
                "name" character varying(64),
                "value" character varying(128),
                "value_is_regex" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "role_id" uuid NOT NULL,
                "role_realm_id" uuid,
                "provider_id" uuid NOT NULL,
                "provider_realm_id" uuid,
                CONSTRAINT "PK_94ee3187d841deee7352ec0a1e0" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_565cc7e3b06db4552002345f75" ON "auth_identity_provider_role_mappings" ("provider_id", "role_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_permission_mappings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "synchronization_mode" character varying(64),
                "name" character varying(64),
                "value" character varying(128),
                "value_is_regex" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "permission_id" uuid NOT NULL,
                "permission_realm_id" uuid,
                "provider_id" uuid NOT NULL,
                "provider_realm_id" uuid,
                CONSTRAINT "PK_7c84627e6bb01fb7bfe1f7ca205" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_39b28b1e3bcd7a665823f15484" ON "auth_identity_provider_permission_mappings" ("provider_id", "permission_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_policy_tree_closure" (
                "ancestor_id" uuid NOT NULL,
                "descendant_id" uuid NOT NULL,
                CONSTRAINT "PK_ee4aed72421eaaa134a529174b7" PRIMARY KEY ("ancestor_id", "descendant_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_864863312111829a4f4ed664c7" ON "auth_policy_tree_closure" ("ancestor_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b09663b133807f1207f499d79a" ON "auth_policy_tree_closure" ("descendant_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP COLUMN "power"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP COLUMN "negation"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP COLUMN "condition"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP COLUMN "fields"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP COLUMN "target"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP COLUMN "power"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP COLUMN "negation"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP COLUMN "target"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP COLUMN "condition"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP COLUMN "fields"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP COLUMN "power"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP COLUMN "negation"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP COLUMN "condition"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP COLUMN "fields"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP COLUMN "target"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD "policy_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD "client_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD "policy_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD "policy_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD "policy_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0d8fb586aa4d177206142bd4ed" ON "auth_permissions" ("client_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b" UNIQUE ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies"
            ADD CONSTRAINT "FK_43caa964bb178ee4b5a5da7b8a7" FOREIGN KEY ("parentId") REFERENCES "auth_policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies"
            ADD CONSTRAINT "FK_707089f1df498d1719972e69aef" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policy_attributes"
            ADD CONSTRAINT "FK_8b759199b8a0213a7a0f7b1986a" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5" FOREIGN KEY ("client_id") REFERENCES "auth_realms"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD CONSTRAINT "FK_cfa1834ece97297955f4a9539ad" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD CONSTRAINT "FK_f15efcb7151cdd0d54ebafdd7fa" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD CONSTRAINT "FK_0786e0bee54b581c62d79a8cec7" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
            ADD CONSTRAINT "FK_af56e638d28a0cc3139c54e8259" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings"
            ADD CONSTRAINT "FK_58a45697736646499b3dc7f0d0c" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings"
            ADD CONSTRAINT "FK_0c89b2c523eee535a9a18422fd0" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings"
            ADD CONSTRAINT "FK_0c61ae237f6a87d65feed8bc452" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings"
            ADD CONSTRAINT "FK_e6d52ed7072ab8488806ed648fc" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings"
            ADD CONSTRAINT "FK_f8dfd31c9dc51e1fb8409c83d05" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings"
            ADD CONSTRAINT "FK_f59883e2400b294414a495002ab" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings"
            ADD CONSTRAINT "FK_acce12b53121e9eb413f32c719d" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings"
            ADD CONSTRAINT "FK_b3a2e4610f9162c3dca88a8cc55" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings"
            ADD CONSTRAINT "FK_f2ea716aa0c8bd034b6f28e9eb4" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policy_tree_closure"
            ADD CONSTRAINT "FK_864863312111829a4f4ed664c79" FOREIGN KEY ("ancestor_id") REFERENCES "auth_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policy_tree_closure"
            ADD CONSTRAINT "FK_b09663b133807f1207f499d79a0" FOREIGN KEY ("descendant_id") REFERENCES "auth_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_policy_tree_closure" DROP CONSTRAINT "FK_b09663b133807f1207f499d79a0"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policy_tree_closure" DROP CONSTRAINT "FK_864863312111829a4f4ed664c79"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings" DROP CONSTRAINT "FK_f2ea716aa0c8bd034b6f28e9eb4"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings" DROP CONSTRAINT "FK_b3a2e4610f9162c3dca88a8cc55"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings" DROP CONSTRAINT "FK_acce12b53121e9eb413f32c719d"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_permission_mappings" DROP CONSTRAINT "FK_f59883e2400b294414a495002ab"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings" DROP CONSTRAINT "FK_f8dfd31c9dc51e1fb8409c83d05"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings" DROP CONSTRAINT "FK_e6d52ed7072ab8488806ed648fc"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings" DROP CONSTRAINT "FK_0c61ae237f6a87d65feed8bc452"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_role_mappings" DROP CONSTRAINT "FK_0c89b2c523eee535a9a18422fd0"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings" DROP CONSTRAINT "FK_58a45697736646499b3dc7f0d0c"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attribute_mappings" DROP CONSTRAINT "FK_af56e638d28a0cc3139c54e8259"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP CONSTRAINT "FK_0786e0bee54b581c62d79a8cec7"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP CONSTRAINT "FK_f15efcb7151cdd0d54ebafdd7fa"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP CONSTRAINT "FK_cfa1834ece97297955f4a9539ad"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "FK_0d8fb586aa4d177206142bd4ed5"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "FK_b669b08267cf6486c7e44a24fb8"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policy_attributes" DROP CONSTRAINT "FK_8b759199b8a0213a7a0f7b1986a"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies" DROP CONSTRAINT "FK_707089f1df498d1719972e69aef"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies" DROP CONSTRAINT "FK_43caa964bb178ee4b5a5da7b8a7"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_0d8fb586aa4d177206142bd4ed"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP COLUMN "policy_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP COLUMN "policy_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP COLUMN "policy_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP COLUMN "client_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP COLUMN "policy_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD "target" character varying(16)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD "fields" text
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD "condition" text
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD "negation" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD "power" integer NOT NULL DEFAULT '999'
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD "fields" text
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD "condition" text
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD "target" character varying(16)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD "negation" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD "power" integer NOT NULL DEFAULT '999'
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD "target" character varying(16)
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD "fields" text
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD "condition" text
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD "negation" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD "power" integer NOT NULL DEFAULT '999'
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b09663b133807f1207f499d79a"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_864863312111829a4f4ed664c7"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policy_tree_closure"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_39b28b1e3bcd7a665823f15484"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_permission_mappings"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_565cc7e3b06db4552002345f75"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_role_mappings"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_13759c902e6d063119f556f621"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_attribute_mappings"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policy_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_policies"
        `);
    }
}
