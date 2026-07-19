/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops the robot entity: auth_robots, auth_robot_roles,
 * auth_robot_permissions, auth_sessions.robot_id and the dangling robot
 * FKs on the legacy auth_refresh_tokens / auth_authorization_codes
 * tables. Robots are superseded by clients (client_credentials grant);
 * robot rows and their role/permission bindings are NOT migrated onto
 * clients — recreate machine identities as clients by hand.
 *
 * down() recreates the pre-removal schema shape, constraint names
 * included, so the older migrations' down() paths keep working.
 */
export class RemoveRobots1784460916000 implements MigrationInterface {
    name = 'RemoveRobots1784460916000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_46b30e5d8e5d5de58d454f53f8c"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP COLUMN "robot_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens" DROP CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes" DROP CONSTRAINT "FK_32619f36922f433e27affc169e4"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robot_permissions"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robot_roles"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robots"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_robots" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "secret" character varying(256) NOT NULL,
                "name" character varying(128) NOT NULL,
                "description" text,
                "active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid,
                "realm_id" uuid NOT NULL,
                "display_name" character varying(256),
                "client_id" uuid,
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
                CONSTRAINT "PK_0417c432636b2b07e36aedd9804" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_91942a5962da3b91175eeaa2db" ON "auth_robots" ("client_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_robot_roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "role_id" uuid NOT NULL,
                "role_realm_id" uuid,
                "robot_id" character varying NOT NULL,
                "robot_realm_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "client_id" uuid,
                CONSTRAINT "PK_6d175a60a9ac83747b28fa8bc6f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_515b3dc84ba9bec42bd0e92cbd" ON "auth_robot_roles" ("role_id", "robot_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_robot_permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "robot_id" uuid NOT NULL,
                "robot_realm_id" uuid,
                "permission_id" uuid NOT NULL,
                "permission_realm_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "policy_id" uuid,
                "realm_scope" character varying(50) NOT NULL DEFAULT 'own',
                CONSTRAINT "PK_df48d512c182954136955472327" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_0c2284272043ed8aba6689306b" ON "auth_robot_permissions" ("permission_id", "robot_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robots"
            ADD CONSTRAINT "FK_b6d73e3026e15c0af6c41ef8139" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robots"
            ADD CONSTRAINT "FK_9c99802f3f360718344180c3f68" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robots"
            ADD CONSTRAINT "FK_91942a5962da3b91175eeaa2db1" FOREIGN KEY ("client_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles"
            ADD CONSTRAINT "FK_2256b04cbdb1e16e5144e14750b" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles"
            ADD CONSTRAINT "FK_28146c7babddcad18116dabfa9e" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles"
            ADD CONSTRAINT "FK_a4904e9c921294c80f75a0c3e02" FOREIGN KEY ("client_id") REFERENCES "auth_robots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles"
            ADD CONSTRAINT "FK_21994ec834c710276cce38c779d" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD CONSTRAINT "FK_5af2884572a617e2532410f8221" FOREIGN KEY ("robot_id") REFERENCES "auth_robots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD CONSTRAINT "FK_d52ab826ee04e008624df74cdc8" FOREIGN KEY ("robot_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions"
            ADD CONSTRAINT "FK_0786e0bee54b581c62d79a8cec7" FOREIGN KEY ("policy_id") REFERENCES "auth_policies"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions"
            ADD "robot_id" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_sessions"
            ADD CONSTRAINT "FK_46b30e5d8e5d5de58d454f53f8c" FOREIGN KEY ("robot_id") REFERENCES "auth_robots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens"
            ADD CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes"
            ADD CONSTRAINT "FK_32619f36922f433e27affc169e4" FOREIGN KEY ("robot_id") REFERENCES "auth_robots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }
}
