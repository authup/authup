import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Default1673449341125 implements MigrationInterface {
    name = 'Default1673449341125';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "auth_realms" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(128) NOT NULL,
                "description" text,
                "drop_able" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_9b95dc8c08d8b11a80a6798a640" UNIQUE ("name"),
                CONSTRAINT "PK_9eee628978e64d0902158e497ca" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_keys" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" character varying(64),
                "priority" integer NOT NULL DEFAULT '0',
                "signature_algorithm" character varying(64),
                "decryption_key" character varying(4096),
                "encryption_key" character varying(4096),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "realm_id" uuid,
                CONSTRAINT "PK_48471fccbf04aa02a191b3aa3a2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fdc78f76d9316352bddfed9165" ON "auth_keys" ("type")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5921107054192639a79fb274b9" ON "auth_keys" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e38d9d6e8be3d1d6e684b60342" ON "auth_keys" ("priority", "realm_id", "type")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(128) NOT NULL,
                "name_locked" boolean NOT NULL DEFAULT true,
                "first_name" character varying(128),
                "last_name" character varying(128),
                "display_name" character varying(128) NOT NULL,
                "email" character varying(256),
                "password" character varying(512),
                "avatar" character varying(255),
                "cover" character varying(255),
                "reset_hash" character varying(256),
                "reset_at" character varying(28),
                "reset_expires" character varying(28),
                "status" character varying(256),
                "status_message" character varying(256),
                "active" boolean NOT NULL DEFAULT true,
                "activate_hash" character varying(256),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "realm_id" uuid NOT NULL,
                CONSTRAINT "UQ_7e0d8fa52a9921d445798c2bb7e" UNIQUE ("name", "realm_id"),
                CONSTRAINT "PK_c88cc8077366b470dafc2917366" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2d54113aa2edfc3955abcf524a" ON "auth_users" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_13d8b49e55a8b06bee6bbc828f" ON "auth_users" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1d5fcbfcbba74381ca8a58a3f1" ON "auth_users" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(64) NOT NULL,
                "target" character varying(16),
                "description" text,
                "realm_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_dce62a3739791bb4fb2fb5c137b" UNIQUE ("name", "realm_id"),
                CONSTRAINT "PK_fa9e7a265809eafa9e1f47122e2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_063e4bd5b708c304b51b7ee774" ON "auth_roles" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(128) NOT NULL,
                "built_in" boolean NOT NULL DEFAULT false,
                "description" text,
                "target" character varying(16),
                "realm_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_40a392cb2ddf6b12f841d06a82e" UNIQUE ("name"),
                CONSTRAINT "PK_9f1634df753682faaf3d2bca55b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9356935453c5e442d375531ee5" ON "auth_permissions" ("realm_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "power" integer NOT NULL DEFAULT '999',
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT false,
                "target" character varying(16),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "role_id" uuid NOT NULL,
                "role_realm_id" uuid,
                "permission_id" uuid NOT NULL,
                "permission_realm_id" uuid,
                CONSTRAINT "PK_b98ae76361a649bdaff08676b44" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_40c0ee0929b20575df125e8d14" ON "auth_role_permissions" ("permission_id", "role_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "role_id" uuid NOT NULL,
                "role_realm_id" uuid,
                "user_id" uuid NOT NULL,
                "user_realm_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c959817346a5a9cab0682551302" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1aaaa657b3c0615f6b4a6e657" ON "auth_user_roles" ("role_id", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "power" integer NOT NULL DEFAULT '999',
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT false,
                "target" character varying(16),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "user_realm_id" uuid,
                "permission_id" uuid NOT NULL,
                "permission_realm_id" uuid,
                CONSTRAINT "PK_9f4e91fe9d13e94b0354ed793d7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e1a21fc2e6ac12fa29b02c4382" ON "auth_user_permissions" ("permission_id", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_user_attributes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "value" text,
                "realm_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_b748c46e233d86287b63b49d09f" UNIQUE ("name", "user_id"),
                CONSTRAINT "PK_a8645a8c813e9a3b90544eea388" PRIMARY KEY ("id")
            )
        `);
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
                CONSTRAINT "UQ_f89cc2abf1d7e284a7d6cd59c12" UNIQUE ("name", "realm_id"),
                CONSTRAINT "PK_0417c432636b2b07e36aedd9804" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9c99802f3f360718344180c3f6" ON "auth_robots" ("realm_id")
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
                "power" integer NOT NULL DEFAULT '999',
                "condition" text,
                "fields" text,
                "negation" boolean NOT NULL DEFAULT false,
                "target" character varying(16),
                "robot_id" uuid NOT NULL,
                "robot_realm_id" uuid,
                "permission_id" uuid NOT NULL,
                "permission_realm_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_df48d512c182954136955472327" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_0c2284272043ed8aba6689306b" ON "auth_robot_permissions" ("permission_id", "robot_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_clients" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(256) NOT NULL,
                "description" text,
                "secret" character varying(256),
                "redirect_uri" text,
                "grant_types" character varying(512),
                "scope" character varying(512),
                "base_url" character varying(2000),
                "root_url" character varying(2000),
                "is_confidential" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "realm_id" uuid,
                "user_id" uuid,
                CONSTRAINT "UQ_6018b722f28f1cc6fdac450e611" UNIQUE ("name", "realm_id"),
                CONSTRAINT "PK_78cdf6da019ce56abcfbbe45e47" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_authorization_codes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "content" character varying(4096) NOT NULL,
                "expires" character varying(28) NOT NULL,
                "scope" character varying(512),
                "redirect_uri" character varying(2000),
                "id_token" character varying(1000),
                "client_id" uuid,
                "user_id" uuid,
                "robot_id" uuid,
                "realm_id" uuid NOT NULL,
                CONSTRAINT "PK_c2ecb6968a63a751bd6fd2e2b6b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_scopes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "built_in" boolean NOT NULL DEFAULT false,
                "name" character varying(128) NOT NULL,
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "realm_id" uuid,
                CONSTRAINT "UQ_b14fab23784a81c282abef41fae" UNIQUE ("name", "realm_id"),
                CONSTRAINT "PK_a3f8e9d06f8d413a18b7b212fde" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_client_scopes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "default" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "client_id" uuid NOT NULL,
                "scope_id" uuid NOT NULL,
                CONSTRAINT "UQ_ddec4250b145536333f137ff963" UNIQUE ("client_id", "scope_id"),
                CONSTRAINT "PK_1594b57c88084fb019807642524" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_providers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "slug" character varying(36) NOT NULL,
                "name" character varying(128) NOT NULL,
                "protocol" character varying(64) NOT NULL,
                "protocol_config" character varying(64),
                "enabled" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "realm_id" uuid NOT NULL,
                CONSTRAINT "UQ_3752f24587d0405c13f5a790da7" UNIQUE ("slug", "realm_id"),
                CONSTRAINT "PK_f5ee520f6fd8625a6d2223a16d6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_attributes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "value" text,
                "provider_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_994a26636cc20da801d5ef4ee40" UNIQUE ("name", "provider_id"),
                CONSTRAINT "PK_c701a8fc87e4f8d7af3bf6a25c7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "access_token" text,
                "refresh_token" text,
                "provider_user_id" character varying(256) NOT NULL,
                "provider_user_name" character varying(256),
                "provider_user_email" character varying(512),
                "expires_in" integer,
                "expires_at" character varying(28),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "provider_id" uuid NOT NULL,
                CONSTRAINT "PK_d43a08fc9f6efcb21e9c39a8607" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_96a230c697b83505e073713507" ON "auth_identity_provider_accounts" ("provider_id", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identity_provider_roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "external_id" character varying(36) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "role_id" uuid NOT NULL,
                "role_realm_id" uuid,
                "provider_id" uuid NOT NULL,
                "provider_realm_id" uuid,
                CONSTRAINT "PK_345f74231cf39250a3e572b84a7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_42df2e30eee05e54c74bced78b" ON "auth_identity_provider_roles" ("provider_id", "external_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_fadb9ce4df580cc42e78b74b2f" ON "auth_identity_provider_roles" ("provider_id", "role_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_refresh_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "expires" character varying(28) NOT NULL,
                "scope" character varying(512),
                "access_token" uuid,
                "client_id" uuid,
                "user_id" uuid,
                "robot_id" uuid,
                "realm_id" uuid NOT NULL,
                CONSTRAINT "PK_df6893d2063a4ea7bbf1eda31e5" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_role_attributes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "value" text,
                "realm_id" uuid,
                "role_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_aabe997ae70f617cb5479ed8d87" UNIQUE ("name", "role_id"),
                CONSTRAINT "PK_4ca2632652ed52dba0d42c59a7e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys"
            ADD CONSTRAINT "FK_5921107054192639a79fb274b91" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users"
            ADD CONSTRAINT "FK_1d5fcbfcbba74381ca8a58a3f17" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles"
            ADD CONSTRAINT "FK_063e4bd5b708c304b51b7ee7743" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions"
            ADD CONSTRAINT "FK_9356935453c5e442d375531ee52" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD CONSTRAINT "FK_3a6789765734cf5f3f555f2098f" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD CONSTRAINT "FK_3d29528c774bc47404659fad030" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions"
            ADD CONSTRAINT "FK_f9ab8919ff5d5993816f6881879" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles"
            ADD CONSTRAINT "FK_866cd5c92b05353aab240bdc10a" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles"
            ADD CONSTRAINT "FK_77fe9d38c984c640fc155503c4f" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles"
            ADD CONSTRAINT "FK_a3a59104c9c9f2a2458972bc96d" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles"
            ADD CONSTRAINT "FK_6161ccebf3af1c475758651de49" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06" FOREIGN KEY ("user_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD CONSTRAINT "FK_cf962d70634dedf7812fc28282a" FOREIGN KEY ("permission_id") REFERENCES "auth_permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions"
            ADD CONSTRAINT "FK_e2de70574303693fea386cc0edd" FOREIGN KEY ("permission_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_attributes"
            ADD CONSTRAINT "FK_9a84db5a27d34b31644b54d9106" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_attributes"
            ADD CONSTRAINT "FK_f50fe4004312e972a547c0e945e" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients"
            ADD CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes"
            ADD CONSTRAINT "FK_ff6e597e9dd296da510efc06d28" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes"
            ADD CONSTRAINT "FK_5119ffb8f6b8ba853e52be2e417" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes"
            ADD CONSTRAINT "FK_32619f36922f433e27affc169e4" FOREIGN KEY ("robot_id") REFERENCES "auth_robots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes"
            ADD CONSTRAINT "FK_343b25488aef1b87f4771f8c7eb" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_scopes"
            ADD CONSTRAINT "FK_69e83c8e7e11a247a0809eb3327" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_scopes"
            ADD CONSTRAINT "FK_6331374fa74645dae2d52547081" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_scopes"
            ADD CONSTRAINT "FK_471f3da9df80f92c382a586e9ca" FOREIGN KEY ("scope_id") REFERENCES "auth_scopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers"
            ADD CONSTRAINT "FK_00fd737c365d688f9edd0c73eca" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attributes"
            ADD CONSTRAINT "FK_5ac40c5ce92142639df65a33e53" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_accounts"
            ADD CONSTRAINT "FK_b07582d2705a04c2e868e6c3742" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_accounts"
            ADD CONSTRAINT "FK_a82bbdf79b8accbfe71326dce00" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles"
            ADD CONSTRAINT "FK_f32f792ca1aeacea0507ef80a11" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles"
            ADD CONSTRAINT "FK_2c3139bd232ffde35b71d43018e" FOREIGN KEY ("role_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles"
            ADD CONSTRAINT "FK_52a568200844cde16722b9bb95e" FOREIGN KEY ("provider_id") REFERENCES "auth_identity_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles"
            ADD CONSTRAINT "FK_d49fb54b140869696a5a14285c7" FOREIGN KEY ("provider_realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens"
            ADD CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52" FOREIGN KEY ("client_id") REFERENCES "auth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens"
            ADD CONSTRAINT "FK_f795ad14f31838e3ddc663ee150" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens"
            ADD CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9" FOREIGN KEY ("robot_id") REFERENCES "auth_robots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens"
            ADD CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_attributes"
            ADD CONSTRAINT "FK_2ba00548c512fffe2e5bf4bb3ff" FOREIGN KEY ("realm_id") REFERENCES "auth_realms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_attributes"
            ADD CONSTRAINT "FK_cd014be6be330f64b8405d0c72a" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "auth_role_attributes" DROP CONSTRAINT "FK_cd014be6be330f64b8405d0c72a"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_attributes" DROP CONSTRAINT "FK_2ba00548c512fffe2e5bf4bb3ff"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens" DROP CONSTRAINT "FK_c1f59fdabbcf5dfd74d6af7f400"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens" DROP CONSTRAINT "FK_6be38b6dbd4ce86ca3d17494ca9"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens" DROP CONSTRAINT "FK_f795ad14f31838e3ddc663ee150"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_refresh_tokens" DROP CONSTRAINT "FK_8f611e7ff67a2b013c909f60d52"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles" DROP CONSTRAINT "FK_d49fb54b140869696a5a14285c7"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles" DROP CONSTRAINT "FK_52a568200844cde16722b9bb95e"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles" DROP CONSTRAINT "FK_2c3139bd232ffde35b71d43018e"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_roles" DROP CONSTRAINT "FK_f32f792ca1aeacea0507ef80a11"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_accounts" DROP CONSTRAINT "FK_a82bbdf79b8accbfe71326dce00"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_accounts" DROP CONSTRAINT "FK_b07582d2705a04c2e868e6c3742"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_provider_attributes" DROP CONSTRAINT "FK_5ac40c5ce92142639df65a33e53"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identity_providers" DROP CONSTRAINT "FK_00fd737c365d688f9edd0c73eca"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_scopes" DROP CONSTRAINT "FK_471f3da9df80f92c382a586e9ca"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_client_scopes" DROP CONSTRAINT "FK_6331374fa74645dae2d52547081"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_scopes" DROP CONSTRAINT "FK_69e83c8e7e11a247a0809eb3327"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes" DROP CONSTRAINT "FK_343b25488aef1b87f4771f8c7eb"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes" DROP CONSTRAINT "FK_32619f36922f433e27affc169e4"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes" DROP CONSTRAINT "FK_5119ffb8f6b8ba853e52be2e417"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_authorization_codes" DROP CONSTRAINT "FK_ff6e597e9dd296da510efc06d28"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "FK_9c9f985a5cfc1ff52a04c05e5d5"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_clients" DROP CONSTRAINT "FK_b628ffa1b2f5415598cfb1a72af"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP CONSTRAINT "FK_1cacb8af1791a5303d30cbf8590"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP CONSTRAINT "FK_b29fe901137f6944ecaf98fcb5a"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP CONSTRAINT "FK_d52ab826ee04e008624df74cdc8"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_permissions" DROP CONSTRAINT "FK_5af2884572a617e2532410f8221"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles" DROP CONSTRAINT "FK_21994ec834c710276cce38c779d"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles" DROP CONSTRAINT "FK_a4904e9c921294c80f75a0c3e02"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles" DROP CONSTRAINT "FK_28146c7babddcad18116dabfa9e"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robot_roles" DROP CONSTRAINT "FK_2256b04cbdb1e16e5144e14750b"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robots" DROP CONSTRAINT "FK_9c99802f3f360718344180c3f68"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_robots" DROP CONSTRAINT "FK_b6d73e3026e15c0af6c41ef8139"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_attributes" DROP CONSTRAINT "FK_f50fe4004312e972a547c0e945e"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_attributes" DROP CONSTRAINT "FK_9a84db5a27d34b31644b54d9106"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP CONSTRAINT "FK_e2de70574303693fea386cc0edd"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP CONSTRAINT "FK_cf962d70634dedf7812fc28282a"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP CONSTRAINT "FK_5bf6d1affe0575299c44bc58c06"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_permissions" DROP CONSTRAINT "FK_c1d4523b08aa27f07dff798f8d6"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles" DROP CONSTRAINT "FK_6161ccebf3af1c475758651de49"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles" DROP CONSTRAINT "FK_a3a59104c9c9f2a2458972bc96d"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles" DROP CONSTRAINT "FK_77fe9d38c984c640fc155503c4f"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_user_roles" DROP CONSTRAINT "FK_866cd5c92b05353aab240bdc10a"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP CONSTRAINT "FK_f9ab8919ff5d5993816f6881879"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP CONSTRAINT "FK_4bbe0c540b241ca21e4bd1d8d12"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP CONSTRAINT "FK_3d29528c774bc47404659fad030"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_role_permissions" DROP CONSTRAINT "FK_3a6789765734cf5f3f555f2098f"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_permissions" DROP CONSTRAINT "FK_9356935453c5e442d375531ee52"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_roles" DROP CONSTRAINT "FK_063e4bd5b708c304b51b7ee7743"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_users" DROP CONSTRAINT "FK_1d5fcbfcbba74381ca8a58a3f17"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_keys" DROP CONSTRAINT "FK_5921107054192639a79fb274b91"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_role_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_refresh_tokens"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_fadb9ce4df580cc42e78b74b2f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_42df2e30eee05e54c74bced78b"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_96a230c697b83505e073713507"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_accounts"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_provider_attributes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identity_providers"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_client_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_authorization_codes"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_clients"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_0c2284272043ed8aba6689306b"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robot_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_515b3dc84ba9bec42bd0e92cbd"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robot_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9c99802f3f360718344180c3f6"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_robots"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_attributes"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e1a21fc2e6ac12fa29b02c4382"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e1aaaa657b3c0615f6b4a6e657"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_user_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_40c0ee0929b20575df125e8d14"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_role_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9356935453c5e442d375531ee5"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_permissions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_063e4bd5b708c304b51b7ee774"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_roles"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1d5fcbfcbba74381ca8a58a3f1"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_13d8b49e55a8b06bee6bbc828f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2d54113aa2edfc3955abcf524a"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_users"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e38d9d6e8be3d1d6e684b60342"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5921107054192639a79fb274b9"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_fdc78f76d9316352bddfed9165"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_keys"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_realms"
        `);
    }
}
