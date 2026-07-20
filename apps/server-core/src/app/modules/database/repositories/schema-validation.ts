/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@rapiq/core';
import { assertSchemaMatchesEntity } from '@rapiq/typeorm';
import type { DataSource, EntityTarget } from 'typeorm';
import { EntityType } from '@authup/core-kit';
import { schemaRegistry } from '../../../../core/index.ts';
import {
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
    ClientScopeEntity,
    ConsentEntity,
    EventEntity,
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
    [EntityType.TRUST_ANCHOR]: TrustAnchorEntity,
    [EntityType.USER]: UserEntity,
    [EntityType.USER_ATTRIBUTE]: UserAttributeEntity,
    userAuthenticator: UserAuthenticatorEntity,
    [EntityType.USER_PERMISSION]: UserPermissionEntity,
    [EntityType.USER_ROLE]: UserRoleEntity,
};

/**
 * Validate every registered entity schema against its TypeORM
 * metadata (`@rapiq/typeorm`'s `assertSchemaMatchesEntity`: allow-lists,
 * fields/sort defaults and the filters default condition tree must
 * reference existing columns/relations). Called by
 * `DatabaseModule.setup` once the DataSource is initialized —
 * schema/entity drift fails the boot, fail-fast.
 */
export function validateEntitySchemas(dataSource: DataSource) : void {
    for (const [name, target] of Object.entries(SCHEMA_ENTITY_TARGETS)) {
        assertSchemaMatchesEntity(
            schemaRegistry.getOrFail(name),
            dataSource.getMetadata(target),
        );
    }
}
