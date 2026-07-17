/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * camelCase entity properties (plan 073) — data migration for persisted
 * property KEYS. Schema/column names are untouched (the snake_case naming
 * strategy pins them); this migration rewrites rows whose VALUES are entity
 * property names:
 *
 * - auth_identity_provider_attributes.name: identity providers are
 *   admin-created (never re-provisioned), so their stored OAuth2/OIDC/LDAP
 *   config keys must be renamed or existing providers break.
 * - auth_policy_attributes.name: policy-type config keys (realm-match, time,
 *   composite) for user-authored policies.
 * - auth_policy_attributes.value where name = 'names': attribute-names
 *   policy denylists enumerate entity property names; a stale snake entry
 *   FAILS OPEN against the camelCase ATTRIBUTES bag. The provisioner MERGE
 *   rewrites the built-in system.*-names-self-manage sets on boot — this is
 *   the belt to that suspender, and it also covers user-authored policies.
 * - auth_user_attributes.name = 'client_id': written by the identity-provider
 *   account manager onto provisioned users (collision-guarded — a row is
 *   skipped when the user already carries a 'clientId' attribute).
 */

const IDENTITY_PROVIDER_ATTRIBUTE_KEYS: [string, string][] = [
    ['authorize_url', 'authorizeUrl'],
    ['token_url', 'tokenUrl'],
    ['token_revoke_url', 'tokenRevokeUrl'],
    ['user_info_url', 'userInfoUrl'],
    ['client_id', 'clientId'],
    ['client_secret', 'clientSecret'],
    ['base_dn', 'baseDn'],
    ['user_base_dn', 'userBaseDn'],
    ['user_name_attribute', 'userNameAttribute'],
    ['user_mail_attribute', 'userMailAttribute'],
    ['user_display_name_attribute', 'userDisplayNameAttribute'],
    ['user_filter', 'userFilter'],
    ['group_base_dn', 'groupBaseDn'],
    ['group_name_attribute', 'groupNameAttribute'],
    ['group_member_attribute', 'groupMemberAttribute'],
    ['group_member_user_attribute', 'groupMemberUserAttribute'],
    ['group_filter', 'groupFilter'],
    ['group_class', 'groupClass'],
    ['start_tls', 'startTls'],
];

const POLICY_ATTRIBUTE_KEYS: [string, string][] = [
    ['attribute_name', 'attributeName'],
    ['attribute_name_strict', 'attributeNameStrict'],
    ['attribute_null_match_all', 'attributeNullMatchAll'],
    ['day_of_week', 'dayOfWeek'],
    ['day_of_month', 'dayOfMonth'],
    ['day_of_year', 'dayOfYear'],
    ['decision_strategy', 'decisionStrategy'],
];

const POLICY_NAMES_VALUES: [string, string][] = [
    ['name_locked', 'nameLocked'],
    ['status_message', 'statusMessage'],
    ['realm_id', 'realmId'],
    ['auth_method', 'authMethod'],
    ['token_binding_method', 'tokenBindingMethod'],
    ['secret_hashed', 'secretHashed'],
    ['secret_encrypted', 'secretEncrypted'],
    ['access_policy_id', 'accessPolicyId'],
    ['user_id', 'userId'],
];

export class CamelCaseAttributes1784289540000 implements MigrationInterface {
    name = 'CamelCaseAttributes1784289540000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const [from, to] of IDENTITY_PROVIDER_ATTRIBUTE_KEYS) {
            await queryRunner.query(
                'UPDATE auth_identity_provider_attributes SET name = ? WHERE name = ?',
                [to, from],
            );
        }

        for (const [from, to] of POLICY_ATTRIBUTE_KEYS) {
            await queryRunner.query(
                'UPDATE auth_policy_attributes SET name = ? WHERE name = ?',
                [to, from],
            );
        }

        for (const [from, to] of POLICY_NAMES_VALUES) {
            await queryRunner.query(
                `UPDATE auth_policy_attributes SET value = REPLACE(value, '"${from}"', '"${to}"') WHERE name = 'names' AND value IS NOT NULL`,
            );
        }

        await queryRunner.query(
            'UPDATE auth_user_attributes a ' +
            "LEFT JOIN auth_user_attributes b ON b.user_id = a.user_id AND b.name = 'clientId' " +
            "SET a.name = 'clientId' WHERE a.name = 'client_id' AND b.id IS NULL",
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'UPDATE auth_user_attributes a ' +
            "LEFT JOIN auth_user_attributes b ON b.user_id = a.user_id AND b.name = 'client_id' " +
            "SET a.name = 'client_id' WHERE a.name = 'clientId' AND b.id IS NULL",
        );

        for (const [from, to] of POLICY_NAMES_VALUES) {
            await queryRunner.query(
                `UPDATE auth_policy_attributes SET value = REPLACE(value, '"${to}"', '"${from}"') WHERE name = 'names' AND value IS NOT NULL`,
            );
        }

        for (const [from, to] of POLICY_ATTRIBUTE_KEYS) {
            await queryRunner.query(
                'UPDATE auth_policy_attributes SET name = ? WHERE name = ?',
                [from, to],
            );
        }

        for (const [from, to] of IDENTITY_PROVIDER_ATTRIBUTE_KEYS) {
            await queryRunner.query(
                'UPDATE auth_identity_provider_attributes SET name = ? WHERE name = ?',
                [from, to],
            );
        }
    }
}
