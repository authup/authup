/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral, Schema } from '@rapiq/core';
import type { DataSource, EntityMetadata, EntityTarget } from 'typeorm';
import { EntityType } from '@authup/core-kit';
import { AuthupError } from '@authup/errors';
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
 * Every allow-listed key of the schema must exist on the entity: plain
 * keys must be column property paths (or relation names, for
 * `relations.allowed`), dotted keys must start with a relation. Turns
 * silent schema/entity drift (e.g. a renamed column) into a boot
 * failure instead of a dead filter or a runtime adapter error.
 */
export function assertSchemaMatchesEntity(
    schema: Schema<any>,
    metadata: EntityMetadata,
) : void {
    const columns = new Set(metadata.columns.map((column) => column.propertyPath));
    const relations = new Set(metadata.relations.map((relation) => relation.propertyName));

    const invalid : string[] = [];
    const check = (keys: unknown, allowRelation: boolean) => {
        if (!Array.isArray(keys)) {
            return;
        }
        for (const key of keys.flat()) {
            if (typeof key !== 'string') {
                continue;
            }
            const [head] = key.split('.');
            const dotted = head !== key;
            if (dotted ? relations.has(head) : (columns.has(key) || (allowRelation && relations.has(key)))) {
                continue;
            }
            invalid.push(key);
        }
    };

    check(schema.fields.default, false);
    check(schema.fields.allowed, false);
    check(schema.filters.allowed, false);
    check(schema.sort.allowed, false);
    check(schema.relations.allowed, true);

    if (invalid.length > 0) {
        throw new AuthupError(
            `The schema "${schema.name}" allow-lists keys unknown to the ` +
            `entity ${metadata.name}: ${invalid.join(', ')}`,
        );
    }
}

/**
 * Validate every registered entity schema against its TypeORM
 * metadata. Called by `DatabaseModule.setup` once the DataSource is
 * initialized — schema/entity drift fails the boot, fail-fast.
 */
export function validateEntitySchemas(dataSource: DataSource) : void {
    for (const [name, target] of Object.entries(SCHEMA_ENTITY_TARGETS)) {
        assertSchemaMatchesEntity(
            schemaRegistry.getOrFail(name),
            dataSource.getMetadata(target),
        );
    }
}
