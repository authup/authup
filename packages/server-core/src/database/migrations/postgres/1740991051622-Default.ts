import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1740991051622 implements MigrationInterface {
    name = 'Default1740991051622';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_policies" DROP CONSTRAINT "FK_43caa964bb178ee4b5a5da7b8a7"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers" DROP CONSTRAINT "UQ_3752f24587d0405c13f5a790da7"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies"
                RENAME COLUMN "parentId" TO "parent_id"
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_client_permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "policy_id" uuid,
                "client_id" uuid NOT NULL,
                "client_realm_id" uuid,
                "permission_id" uuid NOT NULL,
                "permission_realm_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_96f6d38b46d173e1c09c1fd6980" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_3ccaff24ccf92dcd528dab81ef" ON "auth_client_permissions" ("client_id", "permission_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_client_roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "role_id" uuid NOT NULL,
                "role_realm_id" uuid,
                "client_id" uuid NOT NULL,
                "client_realm_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_342171729b303eddbcd86d27f78" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2b1afa844bfc6635f92be68375" ON "auth_client_roles" ("role_id", "client_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers" DROP COLUMN "slug"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD "client_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP COLUMN "name"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD "name" character varying(128) NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_707089f1df498d1719972e69ae" ON "auth_policies" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8f460e65af897b9b049f582ad0" ON "auth_roles" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_69e83c8e7e11a247a0809eb332" ON "auth_scopes" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_00fd737c365d688f9edd0c73ec" ON "auth_identity_providers" ("realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "UQ_561d1b8a5a7db602df418d7cd53" UNIQUE ("name", "client_id", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD CONSTRAINT "UQ_5456fbd03999de8005f6bb88bd8" UNIQUE ("name", "client_id", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
            ADD CONSTRAINT "UQ_ab9dccd698d40bc1ea0938c1dd3" UNIQUE ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies"
            ADD CONSTRAINT "FK_14b3b3b9c0a1b3a1d2abecb6e72" FOREIGN KEY ("parent_id") REFERENCES "auth_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD CONSTRAINT "FK_8f460e65af897b9b049f582ad0e" FOREIGN KEY ("client_id") REFERENCES "auth_realms"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions"
            ADD CONSTRAINT "FK_d677e1082c27aae4ede40db0e97" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions"
            ADD CONSTRAINT "FK_f110581fbc4bb7e6cb2140a854a" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions"
            ADD CONSTRAINT "FK_b27b823c96287617e5bdf008ea8" FOREIGN KEY ("client_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions"
            ADD CONSTRAINT "FK_feb56f67d0c919e7626f1df8367" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions"
            ADD CONSTRAINT "FK_0d08f64ff34cb0d19deff4b1fc9" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles"
            ADD CONSTRAINT "FK_4fbf55515c1520be753cb84cb3c" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles"
            ADD CONSTRAINT "FK_dbcfb3a6d68ad40775ff55b0fd3" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles"
            ADD CONSTRAINT "FK_f88e0dfb5f8c30fc66fef320f63" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles"
            ADD CONSTRAINT "FK_3a3a792dbd6d343c0dabe9900a3" FOREIGN KEY ("client_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles" DROP CONSTRAINT "FK_3a3a792dbd6d343c0dabe9900a3"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles" DROP CONSTRAINT "FK_f88e0dfb5f8c30fc66fef320f63"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles" DROP CONSTRAINT "FK_dbcfb3a6d68ad40775ff55b0fd3"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_roles" DROP CONSTRAINT "FK_4fbf55515c1520be753cb84cb3c"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions" DROP CONSTRAINT "FK_0d08f64ff34cb0d19deff4b1fc9"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions" DROP CONSTRAINT "FK_feb56f67d0c919e7626f1df8367"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions" DROP CONSTRAINT "FK_b27b823c96287617e5bdf008ea8"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions" DROP CONSTRAINT "FK_f110581fbc4bb7e6cb2140a854a"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_permissions" DROP CONSTRAINT "FK_d677e1082c27aae4ede40db0e97"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP CONSTRAINT "FK_8f460e65af897b9b049f582ad0e"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies" DROP CONSTRAINT "FK_14b3b3b9c0a1b3a1d2abecb6e72"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers" DROP CONSTRAINT "UQ_ab9dccd698d40bc1ea0938c1dd3"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP CONSTRAINT "UQ_5456fbd03999de8005f6bb88bd8"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "UQ_561d1b8a5a7db602df418d7cd53"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_00fd737c365d688f9edd0c73ec"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_69e83c8e7e11a247a0809eb332"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8f460e65af897b9b049f582ad0"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_707089f1df498d1719972e69ae"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP COLUMN "name"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD "name" character varying(64) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP COLUMN "client_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
            ADD "slug" character varying(36) NOT NULL
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2b1afa844bfc6635f92be68375"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3ccaff24ccf92dcd528dab81ef"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_permissions"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies"
                RENAME COLUMN "parent_id" TO "parentId"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
            ADD CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b" UNIQUE ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "UQ_81e4d79be52485b31ea4afeb54b" UNIQUE ("name", "realm_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_policies"
            ADD CONSTRAINT "FK_43caa964bb178ee4b5a5da7b8a7" FOREIGN KEY ("parentId") REFERENCES "auth_policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }
}
