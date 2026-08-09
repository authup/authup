/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@rapiq/core';
import { assertSchemaMatchesEntity } from '@rapiq/adapter-typeorm';
import type { DataSource, EntityMetadata, EntityTarget } from 'typeorm';
import { EntityType } from '@authup/core-kit';
import { schemaRegistry } from '../../../../core/index.ts';
import {
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
    ClientScopeEntity,
    ConsentEntity,
    EventEntity,
    IdentityProviderAccountEntity,
    IdentityProviderEntity,
    IdentityProviderRoleMappingEntity,
    KeyEntity,
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyEntity,
    RealmEntity,
    RoleAttributeEntity,
    RoleEntity,
    RolePermissionEntity,
    ScopeEntity,
    SessionEntity,
    SessionTokenEntity,
    TrustAnchorEntity,
    UserAttributeEntity,
    UserAuthenticatorEntity,
    UserEntity,
    UserPermissionEntity,
    UserRoleEntity,
} from '../../../../adapters/database/domains/index.ts';

/**
 * Entity class per registered schema name — the iteration source for
 * the boot-time validation. A mapped name missing from the registry
 * fails via `getOrFail`, so a renamed/removed schema surfaces here too.
 */
const SCHEMA_ENTITY_TARGETS : Record<string, EntityTarget<ObjectLiteral>> = {
    [EntityType.CLIENT]: ClientEntity,
    [EntityType.CLIENT_PERMISSION]: ClientPermissionEntity,
    [EntityType.CLIENT_ROLE]: ClientRoleEntity,
    [EntityType.CLIENT_SCOPE]: ClientScopeEntity,
    [EntityType.CONSENT]: ConsentEntity,
    [EntityType.EVENT]: EventEntity,
    [EntityType.IDENTITY_PROVIDER]: IdentityProviderEntity,
    [EntityType.IDENTITY_PROVIDER_ACCOUNT]: IdentityProviderAccountEntity,
    [EntityType.IDENTITY_PROVIDER_ROLE_MAPPING]: IdentityProviderRoleMappingEntity,
    [EntityType.KEY]: KeyEntity,
    [EntityType.PERMISSION]: PermissionEntity,
    [EntityType.PERMISSION_POLICY]: PermissionPolicyEntity,
    [EntityType.POLICY]: PolicyEntity,
    [EntityType.REALM]: RealmEntity,
    [EntityType.ROLE]: RoleEntity,
    [EntityType.ROLE_ATTRIBUTE]: RoleAttributeEntity,
    [EntityType.ROLE_PERMISSION]: RolePermissionEntity,
    [EntityType.SCOPE]: ScopeEntity,
    [EntityType.SESSION]: SessionEntity,
    [EntityType.SESSION_TOKEN]: SessionTokenEntity,
    [EntityType.TRUST_ANCHOR]: TrustAnchorEntity,
    [EntityType.USER]: UserEntity,
    [EntityType.USER_ATTRIBUTE]: UserAttributeEntity,
    [EntityType.USER_AUTHENTICATOR]: UserAuthenticatorEntity,
    [EntityType.USER_PERMISSION]: UserPermissionEntity,
    [EntityType.USER_ROLE]: UserRoleEntity,
};

/**
 * Selectable columns deliberately kept out of a schema's field
 * allow-list. `select: false` columns are skipped automatically (the
 * entity already declares them hidden); everything listed here is a
 * column that IS selectable but must never ride the API projection.
 */
const SCHEMA_FIELD_EXCLUSIONS : Record<string, string[]> = {
    // device-internal credential blob (TOTP config, WebAuthn public key +
    // signature counter) — surfaced only through the challenge endpoint's
    // trimmed view.
    [EntityType.USER_AUTHENTICATOR]: ['parameters'],
    // external-provider token material plus its expiry metadata — never
    // rides the API projection.
    [EntityType.IDENTITY_PROVIDER_ACCOUNT]: ['accessToken', 'refreshToken', 'expiresIn', 'expiresAt'],
};

/**
 * Every selectable column must appear in the schema's field allow-list:
 * rapiq derives the root projection from `fields` (`default` when
 * present, else `allowed`), so a column missing from BOTH silently
 * vanishes from every collection response — no error, just an absent
 * property (`role.builtIn` went missing this way).
 */
export function assertSchemaFieldsCoverEntity(
    name: string,
    schema: { fields?: { default?: string[], allowed?: string[] } },
    metadata: EntityMetadata,
) : void {
    const declared = new Set([
        ...(schema.fields?.default || []),
        ...(schema.fields?.allowed || []),
    ]);

    const excluded = new Set(SCHEMA_FIELD_EXCLUSIONS[name] || []);
    const missing = metadata.columns
        .filter((column) => column.isSelect)
        .map((column) => column.propertyName)
        .filter((propertyName) => !declared.has(propertyName) && !excluded.has(propertyName));

    if (missing.length > 0) {
        throw new Error(
            `The schema "${name}" does not declare the field(s): ${missing.join(', ')}.`,
        );
    }
}

/**
 * Validate every registered entity schema against its TypeORM
 * metadata (`@rapiq/adapter-typeorm`'s `assertSchemaMatchesEntity`: allow-lists,
 * fields/sort defaults and the filters default condition tree must
 * reference existing columns/relations) and assert its field allow-list
 * covers every selectable column. Called by
 * `DatabaseModule.setup` once the DataSource is initialized —
 * schema/entity drift fails the boot, fail-fast.
 */
export function validateEntitySchemas(dataSource: DataSource) : void {
    for (const [name, target] of Object.entries(SCHEMA_ENTITY_TARGETS)) {
        const schema = schemaRegistry.getOrFail(name);
        const metadata = dataSource.getMetadata(target);

        assertSchemaMatchesEntity(schema, metadata);
        assertSchemaFieldsCoverEntity(name, schema, metadata);
    }
}
