import { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1658508031181 implements MigrationInterface {
    name = 'Default1658508031181';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_clients" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(256) NOT NULL,
                "description" text,
                "secret" varchar(256),
                "redirect_uri" varchar(2000),
                "grant_types" varchar(512),
                "scope" varchar(512),
                "is_confidential" boolean NOT NULL DEFAULT (0),
                "realm_id" varchar,
                "user_id" varchar,
                CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "auth_access_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_0f843d99462f485cf847db9b8cf" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_83d6c9916b02fe7315afb1bcf66" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c40e2f3450b458e935784904fc6" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_44a975dcfe57d213c19245e77be" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "auth_authorization_codes" (
                "id" varchar PRIMARY KEY NOT NULL,
                "content" varchar(4096) NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "redirect_uri" varchar(2000),
                "id_token" varchar(1000),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_ff6e597e9dd296da510efc06d28" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_5119ffb8f6b8ba853e52be2e417" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_32619f36922f433e27affc169e4" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_343b25488aef1b87f4771f8c7eb" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "auth_refresh_tokens" (
                "id" varchar PRIMARY KEY NOT NULL,
                "expires" datetime NOT NULL,
                "scope" varchar(512),
                "client_id" varchar,
                "user_id" varchar,
                "robot_id" varchar,
                "access_token_id" varchar,
                "realm_id" varchar NOT NULL,
                CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52" FOREIGN KEY ("client_id") REFERENCES "auth_clients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f795ad14f31838e3ddc663ee150" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_3c95cc8e54e69c3acc2b87bc420" FOREIGN KEY ("access_token_id") REFERENCES "auth_access_tokens" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400" FOREIGN KEY ("realm_id") REFERENCES "auth_realms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "auth_refresh_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_authorization_codes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_access_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_clients"
        `);
    }
}
