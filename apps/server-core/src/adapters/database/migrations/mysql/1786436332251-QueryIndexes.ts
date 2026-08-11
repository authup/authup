import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Indexes for the query surface and the foreign-key graph.
 *
 * Query surface: backs the rapiq schema `indexes` declarations (rapiq
 * 2.0.0-beta.20 indexed filters/sort, tada5hi/rapiq#895) — every key in a
 * schema's filter/sort allow-list must LEAD a real database index, so the
 * parse-time index policy never rejects a query the allow-lists permit.
 *
 * Foreign-key graph: indexes every remaining FK scalar column (junction
 * *_realm_id and policy_id columns, client.access_policy_id, the EA and
 * identity-provider mapping tables). MySQL always keeps an implicit FK
 * index, so these matter on Postgres, where realm deletion
 * (crypto-shredding) and cascade deletes otherwise full-scan every
 * junction, and EA tree loads sit on the permission-evaluation hot path.
 *
 * Compound access paths: (actor_name, request_ip_address, created_at) on
 * auth_events serves the login-throttle countRecent key and replaces the
 * redundant actor_name single; auth_session_tokens.parent_id serves the
 * grace-window hasConsumedChild lookup; auth_sessions gains its three FK
 * indexes; (provider_user_id, provider_id) serves the federated-login
 * account lookup.
 *
 * Cleanup: drops the three orphaned legacy tables no entity has described
 * since their reworks — auth_authorization_codes (codes moved to cache
 * blobs), auth_refresh_tokens (superseded by auth_session_tokens),
 * auth_identity_provider_roles (superseded by
 * auth_identity_provider_role_mappings). down() recreates them exactly as
 * the pre-existing chain leaves them, so older down() paths keep working.
 *
 * Generated with `migration generate`; derived IDX_<hash> names, generated
 * DDL untouched (hand-authored blocks are marked).
 */

export class QueryIndexes1786436332251 implements MigrationInterface {
    name = 'QueryIndexes1786436332251';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_ce33c3f58b802bb3c7b2668adc\` ON \`auth_events\`
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_4a9118b99a30cfd3d0c49c3f4b\` ON \`auth_realms\` (\`display_name\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_75e631fcfae706212f5bd67a93\` ON \`auth_realms\` (\`built_in\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_711b1c0c94c1f50b72ee0bc5b2\` ON \`auth_realms\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_98610803836c2be19b55bc016b\` ON \`auth_realms\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_7cdad1f4b4773508db1c7907e3\` ON \`auth_policies\` (\`type\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_14b3b3b9c0a1b3a1d2abecb6e7\` ON \`auth_policies\` (\`parent_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_3bdf0256c69127d59bfd92a313\` ON \`auth_policies\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_3f5906dabc9f129555d823408c\` ON \`auth_policies\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f4cdbb6a56eb93fa2598c8483d\` ON \`auth_policy_attributes\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_8b759199b8a0213a7a0f7b1986\` ON \`auth_policy_attributes\` (\`policy_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_7e7bca0ba30295b43b02a69051\` ON \`auth_clients\` (\`access_policy_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_e9d2f1997f5bb2e3b25edc3ab6\` ON \`auth_clients\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_01ff3aa3d7f3ea41711fa3abd5\` ON \`auth_clients\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b628ffa1b2f5415598cfb1a72a\` ON \`auth_clients\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_4f168a45a40758502e4833bb85\` ON \`auth_users\` (\`display_name\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_6597f3e492f4f8f3cc40772575\` ON \`auth_users\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_55c4ee639cdf45eb2453ee4fc7\` ON \`auth_users\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_9a84db5a27d34b31644b54d910\` ON \`auth_user_attributes\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f50fe4004312e972a547c0e945\` ON \`auth_user_attributes\` (\`user_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_fa1bbd036543e4c4fda32b7ca6\` ON \`auth_user_attributes\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_0d93685dd655ce6ee7c8255503\` ON \`auth_user_attributes\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_a4a11809dcf8cdd5fcceec774e\` ON \`auth_sessions\` (\`expires_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b1d224a5ac76b109101ce07231\` ON \`auth_sessions\` (\`seen_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_46ab036699db960a12d34aad2b\` ON \`auth_sessions\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_60c2b21c37d79572f92da3476d\` ON \`auth_sessions\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_4b428fb760524b6ef45e7c2cbf\` ON \`auth_sessions\` (\`client_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_50ccaa6440288a06f0ba693ccc\` ON \`auth_sessions\` (\`user_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_5a40fe23cbb002e73bf740715f\` ON \`auth_sessions\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_2cf41b241977b633ee7df5c8ae\` ON \`auth_keys\` (\`use\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_81ce3477ef39f7b5e0e009e81c\` ON \`auth_keys\` (\`status\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_0a1114947c976bbe430d24b2c9\` ON \`auth_keys\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_5fc18a2304a0cd7129cb8736ed\` ON \`auth_keys\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_5d1a390d8b26eb227c3d2a8ca5\` ON \`auth_roles\` (\`built_in\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_a7a399f06c259755d1b27b01ab\` ON \`auth_roles\` (\`target\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_9c66869156cbedfc95533f0df1\` ON \`auth_roles\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_414d5037e0b67b5dc3643ac8b8\` ON \`auth_roles\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_2ba00548c512fffe2e5bf4bb3f\` ON \`auth_role_attributes\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_cd014be6be330f64b8405d0c72\` ON \`auth_role_attributes\` (\`role_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b4ec5361a8a3f49267ccef575c\` ON \`auth_role_attributes\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_76b7c51aeeeff6d695c0b8e17f\` ON \`auth_role_attributes\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_dbcfb3a6d68ad40775ff55b0fd\` ON \`auth_client_roles\` (\`role_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f88e0dfb5f8c30fc66fef320f6\` ON \`auth_client_roles\` (\`client_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_3a3a792dbd6d343c0dabe9900a\` ON \`auth_client_roles\` (\`client_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_ff4c8615288f1f8ebbeeed7f85\` ON \`auth_client_roles\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_8a110d4e8e1f9be98cc8d41c1c\` ON \`auth_client_roles\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_0979aabd6e00c278eb9ac1e0ca\` ON \`auth_permissions\` (\`built_in\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_798534b4e296f68e1bc658fbe3\` ON \`auth_permissions\` (\`display_name\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_e97033638618a50676a1637ad6\` ON \`auth_permissions\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_5690205a3d8b0ab370f18c0e4f\` ON \`auth_permissions\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_d677e1082c27aae4ede40db0e9\` ON \`auth_client_permissions\` (\`policy_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b27b823c96287617e5bdf008ea\` ON \`auth_client_permissions\` (\`client_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_feb56f67d0c919e7626f1df836\` ON \`auth_client_permissions\` (\`permission_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_0d08f64ff34cb0d19deff4b1fc\` ON \`auth_client_permissions\` (\`permission_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_ccc15bd289a1ee0ba1ff9f061a\` ON \`auth_client_permissions\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_7a11a6fbab29ec59fc185d4f9e\` ON \`auth_client_permissions\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_e41ae7308e97ec75440f973cd8\` ON \`auth_scopes\` (\`built_in\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_a4d3545ecd5c7507c326f6ce0c\` ON \`auth_scopes\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_c6dc9d6f6199967609c555ca07\` ON \`auth_scopes\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_800cdb9ca2821bc6a81b1eff34\` ON \`auth_client_scopes\` (\`default\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_410780c372c6b400e9c6cba743\` ON \`auth_client_scopes\` (\`client_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_471f3da9df80f92c382a586e9c\` ON \`auth_client_scopes\` (\`scope_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_81f39f6e4a90fc8b861cf12dbf\` ON \`auth_client_scopes\` (\`scope_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_88c5c368c6216d7d1f0eb26a97\` ON \`auth_consents\` (\`sub_kind\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_31d8afae3f42a07450dc54c2cb\` ON \`auth_consents\` (\`scope\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_eb128508302d046ee176ef89fd\` ON \`auth_consents\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_6cff5665a42c31ebd8cdcfaad8\` ON \`auth_consents\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_9486a670458a7377d1bd8f6245\` ON \`auth_events\` (\`scope\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_50f3b5dc6ae4eb17e736ca0a7d\` ON \`auth_events\` (\`ref_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_71c9adc2c466c149650c6c56e8\` ON \`auth_events\` (\`actor_type\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_37d01a405dc14c63738f1481b4\` ON \`auth_events\` (\`actor_name\`, \`request_ip_address\`, \`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_bac15f2c6806624e4f7223e5ed\` ON \`auth_identity_providers\` (\`protocol\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_213e1f3bdff969667e71206e9f\` ON \`auth_identity_providers\` (\`enabled\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_6584e5587d2075fb11a8953bdc\` ON \`auth_identity_providers\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_246ce67900aa852582dae0a7d8\` ON \`auth_identity_providers\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_5ac40c5ce92142639df65a33e5\` ON \`auth_identity_provider_attributes\` (\`provider_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_60411456c45c831be656fbf850\` ON \`auth_identity_provider_attributes\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_9630da9b4e6c478189cc6062c5\` ON \`auth_identity_provider_accounts\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_430b7434c1f881ab776562e508\` ON \`auth_identity_provider_accounts\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b07582d2705a04c2e868e6c374\` ON \`auth_identity_provider_accounts\` (\`user_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_c9432656798d6116dd47a896e4\` ON \`auth_identity_provider_accounts\` (\`user_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_209348829a22e0fb2715e937e4\` ON \`auth_identity_provider_accounts\` (\`provider_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_ccf3fd36253755bd9a5f43c516\` ON \`auth_identity_provider_accounts\` (\`provider_user_id\`, \`provider_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_58a45697736646499b3dc7f0d0\` ON \`auth_identity_provider_attribute_mappings\` (\`provider_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f59883e2400b294414a495002a\` ON \`auth_identity_provider_permission_mappings\` (\`permission_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_acce12b53121e9eb413f32c719\` ON \`auth_identity_provider_permission_mappings\` (\`permission_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f2ea716aa0c8bd034b6f28e9eb\` ON \`auth_identity_provider_permission_mappings\` (\`provider_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_e84cd23669ae68b3bfd44ef986\` ON \`auth_identity_provider_role_mappings\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_d84c31eb147bde680370f00ea5\` ON \`auth_identity_provider_role_mappings\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_0c89b2c523eee535a9a18422fd\` ON \`auth_identity_provider_role_mappings\` (\`role_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_0c61ae237f6a87d65feed8bc45\` ON \`auth_identity_provider_role_mappings\` (\`role_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f8dfd31c9dc51e1fb8409c83d0\` ON \`auth_identity_provider_role_mappings\` (\`provider_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_883cfabf7d5f7466a27625843d\` ON \`auth_session_tokens\` (\`client_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_8d823bc0f1c9fae725fe3c6c9e\` ON \`auth_session_tokens\` (\`parent_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_9de8962dead711a91eb52badef\` ON \`auth_session_tokens\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_35eec422fb312f3d2d5d104da3\` ON \`auth_trust_anchors\` (\`enabled\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_a788087fab74ba22302cc128eb\` ON \`auth_trust_anchors\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_16381ac607f6f4e37415a4879f\` ON \`auth_trust_anchors\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b4a3f78a50e369bfd2d1aa2445\` ON \`auth_permission_policies\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_85164349cdb62316ec19b88470\` ON \`auth_permission_policies\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_babb340dda101f2df8334eea5c\` ON \`auth_permission_policies\` (\`permission_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f5225aa8083c99b1cd09f4390c\` ON \`auth_permission_policies\` (\`policy_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_a76f5f6a12317ea0e24a84c1a5\` ON \`auth_permission_policies\` (\`policy_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_6b28c396d6f0c13165ae2d9abe\` ON \`auth_role_permissions\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_d1c82cf7a5659d0e6fce7aa481\` ON \`auth_role_permissions\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_cfa1834ece97297955f4a9539a\` ON \`auth_role_permissions\` (\`policy_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_3a6789765734cf5f3f555f2098\` ON \`auth_role_permissions\` (\`role_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_3d29528c774bc47404659fad03\` ON \`auth_role_permissions\` (\`role_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f9ab8919ff5d5993816f688187\` ON \`auth_role_permissions\` (\`permission_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_c5ad558296a77525b1f52919bf\` ON \`auth_user_authenticators\` (\`confirmed\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_7d3f50dac76afdc4f5a548eaf3\` ON \`auth_user_authenticators\` (\`last_used_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_fc331813cdc3b9c47a83c3be95\` ON \`auth_user_authenticators\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_eb9bd783394e3aedd35f855104\` ON \`auth_user_authenticators\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_db13de293f01ac8ab7bc0342c4\` ON \`auth_user_authenticators\` (\`realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_0a3a42400243fe3f9d969203a8\` ON \`auth_user_permissions\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_bc15924b6889713da243e883ca\` ON \`auth_user_permissions\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f15efcb7151cdd0d54ebafdd7f\` ON \`auth_user_permissions\` (\`policy_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_c1d4523b08aa27f07dff798f8d\` ON \`auth_user_permissions\` (\`user_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_5bf6d1affe0575299c44bc58c0\` ON \`auth_user_permissions\` (\`user_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_e2de70574303693fea386cc0ed\` ON \`auth_user_permissions\` (\`permission_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_77fe9d38c984c640fc155503c4\` ON \`auth_user_roles\` (\`role_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_a3a59104c9c9f2a2458972bc96\` ON \`auth_user_roles\` (\`user_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_6161ccebf3af1c475758651de4\` ON \`auth_user_roles\` (\`user_realm_id\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_e0588e81b8ff3c640311b7ee39\` ON \`auth_user_roles\` (\`created_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_92ba9504d7698a5a3de297ac76\` ON \`auth_user_roles\` (\`updated_at\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_f8538b58d9fe496e4c7bc6c565\` ON \`auth_users\` (\`reset_hash\`)
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_b2003e5ab8c075dc0a11f33bca\` ON \`auth_users\` (\`activate_hash\`)
        `);
        // Hand-authored: drop the three orphaned legacy tables. Each predates a
        // rework that replaced it and nothing has referenced them since:
        // auth_authorization_codes (codes moved to cache blobs),
        // auth_refresh_tokens (superseded by auth_session_tokens, refresh
        // rotation), auth_identity_provider_roles (superseded by
        // auth_identity_provider_role_mappings in the identity-provider
        // rework). No entity describes them, so the schema-drift gate never
        // compared them; rows are pre-rework leftovers and are destroyed.
        await queryRunner.query(`
            DROP TABLE \`auth_authorization_codes\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_refresh_tokens\`
        `);
        await queryRunner.query(`
            DROP TABLE \`auth_identity_provider_roles\`
        `);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_b2003e5ab8c075dc0a11f33bca\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f8538b58d9fe496e4c7bc6c565\` ON \`auth_users\`
        `);
        // Hand-authored: recreate the dropped legacy tables exactly as the
        // pre-existing chain leaves them (constraint and index names
        // included, robot FKs excluded — RemoveRobots dropped those), so
        // the older migrations' down() paths keep working.
        await queryRunner.query(`
            CREATE TABLE \`auth_authorization_codes\` (
                \`id\` varchar(36) NOT NULL,
                \`content\` varchar(4096) NOT NULL,
                \`expires\` varchar(28) NOT NULL,
                \`scope\` varchar(512) NULL,
                \`redirect_uri\` varchar(2000) NULL,
                \`id_token\` varchar(1000) NULL,
                \`client_id\` varchar(255) NULL,
                \`user_id\` varchar(255) NULL,
                \`robot_id\` varchar(255) NULL,
                \`realm_id\` varchar(255) NOT NULL,
                INDEX \`FK_ff6e597e9dd296da510efc06d28\` (\`client_id\`),
                INDEX \`FK_5119ffb8f6b8ba853e52be2e417\` (\`user_id\`),
                INDEX \`FK_32619f36922f433e27affc169e4\` (\`robot_id\`),
                INDEX \`FK_343b25488aef1b87f4771f8c7eb\` (\`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_refresh_tokens\` (
                \`id\` varchar(36) NOT NULL,
                \`expires\` varchar(28) NOT NULL,
                \`scope\` varchar(512) NULL,
                \`access_token\` varchar(255) NULL,
                \`client_id\` varchar(255) NULL,
                \`user_id\` varchar(255) NULL,
                \`robot_id\` varchar(255) NULL,
                \`realm_id\` varchar(255) NOT NULL,
                INDEX \`FK_8f611e7ff67a2b013c909f60d52\` (\`client_id\`),
                INDEX \`FK_f795ad14f31838e3ddc663ee150\` (\`user_id\`),
                INDEX \`FK_6be38b6dbd4ce86ca3d17494ca9\` (\`robot_id\`),
                INDEX \`FK_c1f59fdabbcf5dfd74d6af7f400\` (\`realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`auth_identity_provider_roles\` (
                \`id\` varchar(36) NOT NULL,
                \`external_id\` varchar(36) NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`role_id\` varchar(255) NOT NULL,
                \`role_realm_id\` varchar(255) NULL,
                \`provider_id\` varchar(255) NOT NULL,
                \`provider_realm_id\` varchar(255) NULL,
                UNIQUE INDEX \`IDX_42df2e30eee05e54c74bced78b\` (\`provider_id\`, \`external_id\`),
                UNIQUE INDEX \`IDX_fadb9ce4df580cc42e78b74b2f\` (\`provider_id\`, \`role_id\`),
                INDEX \`FK_f32f792ca1aeacea0507ef80a11\` (\`role_id\`),
                INDEX \`FK_2c3139bd232ffde35b71d43018e\` (\`role_realm_id\`),
                INDEX \`FK_d49fb54b140869696a5a14285c7\` (\`provider_realm_id\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\`
            ADD CONSTRAINT \`FK_343b25488aef1b87f4771f8c7eb\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\`
            ADD CONSTRAINT \`FK_5119ffb8f6b8ba853e52be2e417\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_authorization_codes\`
            ADD CONSTRAINT \`FK_ff6e597e9dd296da510efc06d28\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\`
            ADD CONSTRAINT \`FK_8f611e7ff67a2b013c909f60d52\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\`
            ADD CONSTRAINT \`FK_c1f59fdabbcf5dfd74d6af7f400\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_refresh_tokens\`
            ADD CONSTRAINT \`FK_f795ad14f31838e3ddc663ee150\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\`
            ADD CONSTRAINT \`FK_2c3139bd232ffde35b71d43018e\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\`
            ADD CONSTRAINT \`FK_52a568200844cde16722b9bb95e\` FOREIGN KEY (\`provider_id\`) REFERENCES \`auth_identity_providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\`
            ADD CONSTRAINT \`FK_d49fb54b140869696a5a14285c7\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_roles\`
            ADD CONSTRAINT \`FK_f32f792ca1aeacea0507ef80a11\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        // Hand-authored (generator gap): each index this migration created on
        // these foreign-key columns became the constraint's ONLY serving index
        // (MySQL auto-drops the implicit FK index once another index can serve
        // the constraint), so the generated DROP INDEX statements below would
        // fail with "needed in a foreign key constraint". Drop the constraints
        // first; they are re-added at the end of this method, and each ADD
        // recreates its implicit index under the constraint's own name, which
        // restores the exact pre-migration state.
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_b27b823c96287617e5bdf008ea8\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_feb56f67d0c919e7626f1df8367\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_0d08f64ff34cb0d19deff4b1fc9\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` DROP FOREIGN KEY \`FK_d677e1082c27aae4ede40db0e97\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` DROP FOREIGN KEY \`FK_f88e0dfb5f8c30fc66fef320f63\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` DROP FOREIGN KEY \`FK_3a3a792dbd6d343c0dabe9900a3\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` DROP FOREIGN KEY \`FK_dbcfb3a6d68ad40775ff55b0fd3\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP FOREIGN KEY \`FK_410780c372c6b400e9c6cba7433\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP FOREIGN KEY \`FK_471f3da9df80f92c382a586e9ca\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` DROP FOREIGN KEY \`FK_81f39f6e4a90fc8b861cf12dbf8\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_7e7bca0ba30295b43b02a690511\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` DROP FOREIGN KEY \`FK_b628ffa1b2f5415598cfb1a72af\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP FOREIGN KEY \`FK_209348829a22e0fb2715e937e44\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP FOREIGN KEY \`FK_b07582d2705a04c2e868e6c3742\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` DROP FOREIGN KEY \`FK_c9432656798d6116dd47a896e45\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\` DROP FOREIGN KEY \`FK_58a45697736646499b3dc7f0d0c\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\` DROP FOREIGN KEY \`FK_5ac40c5ce92142639df65a33e53\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\` DROP FOREIGN KEY \`FK_60411456c45c831be656fbf8506\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` DROP FOREIGN KEY \`FK_f59883e2400b294414a495002ab\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` DROP FOREIGN KEY \`FK_acce12b53121e9eb413f32c719d\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` DROP FOREIGN KEY \`FK_f2ea716aa0c8bd034b6f28e9eb4\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` DROP FOREIGN KEY \`FK_f8dfd31c9dc51e1fb8409c83d05\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` DROP FOREIGN KEY \`FK_0c89b2c523eee535a9a18422fd0\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` DROP FOREIGN KEY \`FK_0c61ae237f6a87d65feed8bc452\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permission_policies\` DROP FOREIGN KEY \`FK_babb340dda101f2df8334eea5c9\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permission_policies\` DROP FOREIGN KEY \`FK_f5225aa8083c99b1cd09f4390c7\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permission_policies\` DROP FOREIGN KEY \`FK_a76f5f6a12317ea0e24a84c1a5b\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` DROP FOREIGN KEY \`FK_14b3b3b9c0a1b3a1d2abecb6e72\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_attributes\` DROP FOREIGN KEY \`FK_8b759199b8a0213a7a0f7b1986a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_attributes\` DROP FOREIGN KEY \`FK_f4cdbb6a56eb93fa2598c8483de\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_attributes\` DROP FOREIGN KEY \`FK_2ba00548c512fffe2e5bf4bb3ff\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_attributes\` DROP FOREIGN KEY \`FK_cd014be6be330f64b8405d0c72a\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_f9ab8919ff5d5993816f6881879\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_cfa1834ece97297955f4a9539ad\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_3a6789765734cf5f3f555f2098f\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` DROP FOREIGN KEY \`FK_3d29528c774bc47404659fad030\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_session_tokens\` DROP FOREIGN KEY \`FK_883cfabf7d5f7466a27625843db\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_4b428fb760524b6ef45e7c2cbff\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_5a40fe23cbb002e73bf740715f5\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_50ccaa6440288a06f0ba693ccc6\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_attributes\` DROP FOREIGN KEY \`FK_9a84db5a27d34b31644b54d9106\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_attributes\` DROP FOREIGN KEY \`FK_f50fe4004312e972a547c0e945e\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\` DROP FOREIGN KEY \`FK_db13de293f01ac8ab7bc0342c4f\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_e2de70574303693fea386cc0edd\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_f15efcb7151cdd0d54ebafdd7fa\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_c1d4523b08aa27f07dff798f8d6\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` DROP FOREIGN KEY \`FK_5bf6d1affe0575299c44bc58c06\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` DROP FOREIGN KEY \`FK_77fe9d38c984c640fc155503c4f\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` DROP FOREIGN KEY \`FK_a3a59104c9c9f2a2458972bc96d\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` DROP FOREIGN KEY \`FK_6161ccebf3af1c475758651de49\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_92ba9504d7698a5a3de297ac76\` ON \`auth_user_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e0588e81b8ff3c640311b7ee39\` ON \`auth_user_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6161ccebf3af1c475758651de4\` ON \`auth_user_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a3a59104c9c9f2a2458972bc96\` ON \`auth_user_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_77fe9d38c984c640fc155503c4\` ON \`auth_user_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e2de70574303693fea386cc0ed\` ON \`auth_user_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5bf6d1affe0575299c44bc58c0\` ON \`auth_user_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_c1d4523b08aa27f07dff798f8d\` ON \`auth_user_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f15efcb7151cdd0d54ebafdd7f\` ON \`auth_user_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_bc15924b6889713da243e883ca\` ON \`auth_user_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0a3a42400243fe3f9d969203a8\` ON \`auth_user_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_db13de293f01ac8ab7bc0342c4\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_eb9bd783394e3aedd35f855104\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_fc331813cdc3b9c47a83c3be95\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_7d3f50dac76afdc4f5a548eaf3\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_c5ad558296a77525b1f52919bf\` ON \`auth_user_authenticators\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f9ab8919ff5d5993816f688187\` ON \`auth_role_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3d29528c774bc47404659fad03\` ON \`auth_role_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3a6789765734cf5f3f555f2098\` ON \`auth_role_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_cfa1834ece97297955f4a9539a\` ON \`auth_role_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_d1c82cf7a5659d0e6fce7aa481\` ON \`auth_role_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6b28c396d6f0c13165ae2d9abe\` ON \`auth_role_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a76f5f6a12317ea0e24a84c1a5\` ON \`auth_permission_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f5225aa8083c99b1cd09f4390c\` ON \`auth_permission_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_babb340dda101f2df8334eea5c\` ON \`auth_permission_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_85164349cdb62316ec19b88470\` ON \`auth_permission_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b4a3f78a50e369bfd2d1aa2445\` ON \`auth_permission_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_16381ac607f6f4e37415a4879f\` ON \`auth_trust_anchors\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a788087fab74ba22302cc128eb\` ON \`auth_trust_anchors\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_35eec422fb312f3d2d5d104da3\` ON \`auth_trust_anchors\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9de8962dead711a91eb52badef\` ON \`auth_session_tokens\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_8d823bc0f1c9fae725fe3c6c9e\` ON \`auth_session_tokens\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_883cfabf7d5f7466a27625843d\` ON \`auth_session_tokens\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f8dfd31c9dc51e1fb8409c83d0\` ON \`auth_identity_provider_role_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0c61ae237f6a87d65feed8bc45\` ON \`auth_identity_provider_role_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0c89b2c523eee535a9a18422fd\` ON \`auth_identity_provider_role_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_d84c31eb147bde680370f00ea5\` ON \`auth_identity_provider_role_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e84cd23669ae68b3bfd44ef986\` ON \`auth_identity_provider_role_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f2ea716aa0c8bd034b6f28e9eb\` ON \`auth_identity_provider_permission_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_acce12b53121e9eb413f32c719\` ON \`auth_identity_provider_permission_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f59883e2400b294414a495002a\` ON \`auth_identity_provider_permission_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_58a45697736646499b3dc7f0d0\` ON \`auth_identity_provider_attribute_mappings\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_ccf3fd36253755bd9a5f43c516\` ON \`auth_identity_provider_accounts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_209348829a22e0fb2715e937e4\` ON \`auth_identity_provider_accounts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_c9432656798d6116dd47a896e4\` ON \`auth_identity_provider_accounts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b07582d2705a04c2e868e6c374\` ON \`auth_identity_provider_accounts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_430b7434c1f881ab776562e508\` ON \`auth_identity_provider_accounts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9630da9b4e6c478189cc6062c5\` ON \`auth_identity_provider_accounts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_60411456c45c831be656fbf850\` ON \`auth_identity_provider_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5ac40c5ce92142639df65a33e5\` ON \`auth_identity_provider_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_246ce67900aa852582dae0a7d8\` ON \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6584e5587d2075fb11a8953bdc\` ON \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_213e1f3bdff969667e71206e9f\` ON \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_bac15f2c6806624e4f7223e5ed\` ON \`auth_identity_providers\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_37d01a405dc14c63738f1481b4\` ON \`auth_events\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_71c9adc2c466c149650c6c56e8\` ON \`auth_events\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_50f3b5dc6ae4eb17e736ca0a7d\` ON \`auth_events\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9486a670458a7377d1bd8f6245\` ON \`auth_events\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6cff5665a42c31ebd8cdcfaad8\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_eb128508302d046ee176ef89fd\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_31d8afae3f42a07450dc54c2cb\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_88c5c368c6216d7d1f0eb26a97\` ON \`auth_consents\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_81f39f6e4a90fc8b861cf12dbf\` ON \`auth_client_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_471f3da9df80f92c382a586e9c\` ON \`auth_client_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_410780c372c6b400e9c6cba743\` ON \`auth_client_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_800cdb9ca2821bc6a81b1eff34\` ON \`auth_client_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_c6dc9d6f6199967609c555ca07\` ON \`auth_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a4d3545ecd5c7507c326f6ce0c\` ON \`auth_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e41ae7308e97ec75440f973cd8\` ON \`auth_scopes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_7a11a6fbab29ec59fc185d4f9e\` ON \`auth_client_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_ccc15bd289a1ee0ba1ff9f061a\` ON \`auth_client_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0d08f64ff34cb0d19deff4b1fc\` ON \`auth_client_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_feb56f67d0c919e7626f1df836\` ON \`auth_client_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b27b823c96287617e5bdf008ea\` ON \`auth_client_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_d677e1082c27aae4ede40db0e9\` ON \`auth_client_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5690205a3d8b0ab370f18c0e4f\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e97033638618a50676a1637ad6\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_798534b4e296f68e1bc658fbe3\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0979aabd6e00c278eb9ac1e0ca\` ON \`auth_permissions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_8a110d4e8e1f9be98cc8d41c1c\` ON \`auth_client_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_ff4c8615288f1f8ebbeeed7f85\` ON \`auth_client_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3a3a792dbd6d343c0dabe9900a\` ON \`auth_client_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f88e0dfb5f8c30fc66fef320f6\` ON \`auth_client_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_dbcfb3a6d68ad40775ff55b0fd\` ON \`auth_client_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_76b7c51aeeeff6d695c0b8e17f\` ON \`auth_role_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b4ec5361a8a3f49267ccef575c\` ON \`auth_role_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_cd014be6be330f64b8405d0c72\` ON \`auth_role_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_2ba00548c512fffe2e5bf4bb3f\` ON \`auth_role_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_414d5037e0b67b5dc3643ac8b8\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9c66869156cbedfc95533f0df1\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a7a399f06c259755d1b27b01ab\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5d1a390d8b26eb227c3d2a8ca5\` ON \`auth_roles\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5fc18a2304a0cd7129cb8736ed\` ON \`auth_keys\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0a1114947c976bbe430d24b2c9\` ON \`auth_keys\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_81ce3477ef39f7b5e0e009e81c\` ON \`auth_keys\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_2cf41b241977b633ee7df5c8ae\` ON \`auth_keys\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5a40fe23cbb002e73bf740715f\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_50ccaa6440288a06f0ba693ccc\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_4b428fb760524b6ef45e7c2cbf\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_60c2b21c37d79572f92da3476d\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_46ab036699db960a12d34aad2b\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b1d224a5ac76b109101ce07231\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a4a11809dcf8cdd5fcceec774e\` ON \`auth_sessions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_0d93685dd655ce6ee7c8255503\` ON \`auth_user_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_fa1bbd036543e4c4fda32b7ca6\` ON \`auth_user_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f50fe4004312e972a547c0e945\` ON \`auth_user_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_9a84db5a27d34b31644b54d910\` ON \`auth_user_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_55c4ee639cdf45eb2453ee4fc7\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_6597f3e492f4f8f3cc40772575\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_4f168a45a40758502e4833bb85\` ON \`auth_users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_b628ffa1b2f5415598cfb1a72a\` ON \`auth_clients\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_01ff3aa3d7f3ea41711fa3abd5\` ON \`auth_clients\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_e9d2f1997f5bb2e3b25edc3ab6\` ON \`auth_clients\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_7e7bca0ba30295b43b02a69051\` ON \`auth_clients\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_8b759199b8a0213a7a0f7b1986\` ON \`auth_policy_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_f4cdbb6a56eb93fa2598c8483d\` ON \`auth_policy_attributes\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3f5906dabc9f129555d823408c\` ON \`auth_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_3bdf0256c69127d59bfd92a313\` ON \`auth_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_14b3b3b9c0a1b3a1d2abecb6e7\` ON \`auth_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_7cdad1f4b4773508db1c7907e3\` ON \`auth_policies\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_98610803836c2be19b55bc016b\` ON \`auth_realms\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_711b1c0c94c1f50b72ee0bc5b2\` ON \`auth_realms\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_75e631fcfae706212f5bd67a93\` ON \`auth_realms\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_4a9118b99a30cfd3d0c49c3f4b\` ON \`auth_realms\`
        `);
        await queryRunner.query(`
            CREATE INDEX \`IDX_ce33c3f58b802bb3c7b2668adc\` ON \`auth_events\` (\`actor_name\`)
        `);
        // Hand-authored: re-add the foreign keys dropped at the top (recreates
        // each implicit FK index under the constraint's own name).
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` ADD CONSTRAINT \`FK_b27b823c96287617e5bdf008ea8\` FOREIGN KEY (\`client_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` ADD CONSTRAINT \`FK_feb56f67d0c919e7626f1df8367\` FOREIGN KEY (\`permission_id\`) REFERENCES \`auth_permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` ADD CONSTRAINT \`FK_0d08f64ff34cb0d19deff4b1fc9\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_permissions\` ADD CONSTRAINT \`FK_d677e1082c27aae4ede40db0e97\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` ADD CONSTRAINT \`FK_f88e0dfb5f8c30fc66fef320f63\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` ADD CONSTRAINT \`FK_3a3a792dbd6d343c0dabe9900a3\` FOREIGN KEY (\`client_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_roles\` ADD CONSTRAINT \`FK_dbcfb3a6d68ad40775ff55b0fd3\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` ADD CONSTRAINT \`FK_410780c372c6b400e9c6cba7433\` FOREIGN KEY (\`client_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` ADD CONSTRAINT \`FK_471f3da9df80f92c382a586e9ca\` FOREIGN KEY (\`scope_id\`) REFERENCES \`auth_scopes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_client_scopes\` ADD CONSTRAINT \`FK_81f39f6e4a90fc8b861cf12dbf8\` FOREIGN KEY (\`scope_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` ADD CONSTRAINT \`FK_7e7bca0ba30295b43b02a690511\` FOREIGN KEY (\`access_policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_clients\` ADD CONSTRAINT \`FK_b628ffa1b2f5415598cfb1a72af\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` ADD CONSTRAINT \`FK_209348829a22e0fb2715e937e44\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` ADD CONSTRAINT \`FK_b07582d2705a04c2e868e6c3742\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_accounts\` ADD CONSTRAINT \`FK_c9432656798d6116dd47a896e45\` FOREIGN KEY (\`user_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attribute_mappings\` ADD CONSTRAINT \`FK_58a45697736646499b3dc7f0d0c\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\` ADD CONSTRAINT \`FK_5ac40c5ce92142639df65a33e53\` FOREIGN KEY (\`provider_id\`) REFERENCES \`auth_identity_providers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_attributes\` ADD CONSTRAINT \`FK_60411456c45c831be656fbf8506\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` ADD CONSTRAINT \`FK_f59883e2400b294414a495002ab\` FOREIGN KEY (\`permission_id\`) REFERENCES \`auth_permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` ADD CONSTRAINT \`FK_acce12b53121e9eb413f32c719d\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_permission_mappings\` ADD CONSTRAINT \`FK_f2ea716aa0c8bd034b6f28e9eb4\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` ADD CONSTRAINT \`FK_f8dfd31c9dc51e1fb8409c83d05\` FOREIGN KEY (\`provider_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` ADD CONSTRAINT \`FK_0c89b2c523eee535a9a18422fd0\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_identity_provider_role_mappings\` ADD CONSTRAINT \`FK_0c61ae237f6a87d65feed8bc452\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permission_policies\` ADD CONSTRAINT \`FK_babb340dda101f2df8334eea5c9\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permission_policies\` ADD CONSTRAINT \`FK_f5225aa8083c99b1cd09f4390c7\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_permission_policies\` ADD CONSTRAINT \`FK_a76f5f6a12317ea0e24a84c1a5b\` FOREIGN KEY (\`policy_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policies\` ADD CONSTRAINT \`FK_14b3b3b9c0a1b3a1d2abecb6e72\` FOREIGN KEY (\`parent_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_attributes\` ADD CONSTRAINT \`FK_8b759199b8a0213a7a0f7b1986a\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_policy_attributes\` ADD CONSTRAINT \`FK_f4cdbb6a56eb93fa2598c8483de\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_attributes\` ADD CONSTRAINT \`FK_2ba00548c512fffe2e5bf4bb3ff\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_attributes\` ADD CONSTRAINT \`FK_cd014be6be330f64b8405d0c72a\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` ADD CONSTRAINT \`FK_f9ab8919ff5d5993816f6881879\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` ADD CONSTRAINT \`FK_cfa1834ece97297955f4a9539ad\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` ADD CONSTRAINT \`FK_3a6789765734cf5f3f555f2098f\` FOREIGN KEY (\`role_id\`) REFERENCES \`auth_roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_role_permissions\` ADD CONSTRAINT \`FK_3d29528c774bc47404659fad030\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_session_tokens\` ADD CONSTRAINT \`FK_883cfabf7d5f7466a27625843db\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` ADD CONSTRAINT \`FK_4b428fb760524b6ef45e7c2cbff\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` ADD CONSTRAINT \`FK_5a40fe23cbb002e73bf740715f5\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` ADD CONSTRAINT \`FK_50ccaa6440288a06f0ba693ccc6\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_attributes\` ADD CONSTRAINT \`FK_9a84db5a27d34b31644b54d9106\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_attributes\` ADD CONSTRAINT \`FK_f50fe4004312e972a547c0e945e\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_authenticators\` ADD CONSTRAINT \`FK_db13de293f01ac8ab7bc0342c4f\` FOREIGN KEY (\`realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` ADD CONSTRAINT \`FK_e2de70574303693fea386cc0edd\` FOREIGN KEY (\`permission_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` ADD CONSTRAINT \`FK_f15efcb7151cdd0d54ebafdd7fa\` FOREIGN KEY (\`policy_id\`) REFERENCES \`auth_policies\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` ADD CONSTRAINT \`FK_c1d4523b08aa27f07dff798f8d6\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_permissions\` ADD CONSTRAINT \`FK_5bf6d1affe0575299c44bc58c06\` FOREIGN KEY (\`user_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` ADD CONSTRAINT \`FK_77fe9d38c984c640fc155503c4f\` FOREIGN KEY (\`role_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` ADD CONSTRAINT \`FK_a3a59104c9c9f2a2458972bc96d\` FOREIGN KEY (\`user_id\`) REFERENCES \`auth_users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_user_roles\` ADD CONSTRAINT \`FK_6161ccebf3af1c475758651de49\` FOREIGN KEY (\`user_realm_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }
}
