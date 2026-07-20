/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@rapiq/core';
import { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
    ClientScopeEntity,
    ConsentEntity,
    EventEntity,
    IdentityProviderAccountEntity,
    IdentityProviderAttributeEntity,
    IdentityProviderAttributeMappingEntity,
    IdentityProviderEntity,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderRoleMappingEntity,
    KeyEntity,
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyAttributeEntity,
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
} from '../../../../../src/adapters/database/domains/index.ts';
import {
    assertSchemaMatchesEntity,
    validateEntitySchemas,
} from '../../../../../src/app/modules/database/repositories/schema-validation.ts';

describe('app/modules/database/repositories/schema-validation', () => {
    let dataSource : DataSource;

    // metadata-only DataSource (no synchronize) — validation reads the
    // entity metadata, never the tables.
    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'better-sqlite3',
            database: ':memory:',
            entities: [
                ClientEntity,
                ClientPermissionEntity,
                ClientRoleEntity,
                ClientScopeEntity,
                ConsentEntity,
                EventEntity,
                IdentityProviderAccountEntity,
                IdentityProviderAttributeEntity,
                IdentityProviderAttributeMappingEntity,
                IdentityProviderEntity,
                IdentityProviderPermissionMappingEntity,
                IdentityProviderRoleMappingEntity,
                KeyEntity,
                PermissionEntity,
                PermissionPolicyEntity,
                PolicyAttributeEntity,
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
            ],
        });
        await dataSource.initialize();
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    it('should accept every registered entity schema', () => {
        expect(() => validateEntitySchemas(dataSource)).not.toThrow();
    });

    it('should reject an allow-listed key unknown to the entity', () => {
        const schema = defineSchema({
            name: 'drifted',
            filters: { allowed: ['id', 'renamedAway'] },
        });

        expect(() => assertSchemaMatchesEntity(schema, dataSource.getMetadata(RoleEntity)))
            .toThrowError(/renamedAway/);
    });

    it('should accept dotted keys headed by a relation and reject others', () => {
        const valid = defineSchema({
            name: 'dotted-valid',
            sort: { allowed: ['realm.name'] },
        });
        expect(() => assertSchemaMatchesEntity(valid, dataSource.getMetadata(RoleEntity)))
            .not.toThrow();

        const invalid = defineSchema({
            name: 'dotted-invalid',
            sort: { allowed: ['unknownRelation.name'] },
        });
        expect(() => assertSchemaMatchesEntity(invalid, dataSource.getMetadata(RoleEntity)))
            .toThrowError(/unknownRelation.name/);
    });

    it('should accept relation names in the relations allow-list only', () => {
        const relation = defineSchema({
            name: 'relations-ok',
            relations: { allowed: ['realm'] },
        });
        expect(() => assertSchemaMatchesEntity(relation, dataSource.getMetadata(RoleEntity)))
            .not.toThrow();

        const field = defineSchema({
            name: 'relation-as-field',
            fields: { allowed: ['realm'] },
        });
        expect(() => assertSchemaMatchesEntity(field, dataSource.getMetadata(RoleEntity)))
            .toThrowError(/realm/);
    });
});
