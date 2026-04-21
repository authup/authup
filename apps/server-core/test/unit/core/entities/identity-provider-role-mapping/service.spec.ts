/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { 
    BadRequestError, 
    ConflictError, 
    ForbiddenError, 
    NotFoundError, 
} from '@ebec/http';
import { IdentityProviderRoleMappingService } from '../../../../../src/core/entities/identity-provider-role-mapping/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/identity-provider-role-mapping/service', () => {
    let repository: FakeEntityRepository<IdentityProviderRoleMapping>;
    let identityPermissionProvider: {
        getFor: ReturnType<typeof vi.fn>;
        isSuperset: ReturnType<typeof vi.fn>;
        resolveJunctionPolicy: ReturnType<typeof vi.fn>;
    };
    let service: IdentityProviderRoleMappingService;

    beforeEach(() => {
        repository = new FakeEntityRepository<IdentityProviderRoleMapping>();
        identityPermissionProvider = {
            getFor: vi.fn(),
            isSuperset: vi.fn().mockResolvedValue(true),
            resolveJunctionPolicy: vi.fn(),
        };
        service = new IdentityProviderRoleMappingService({ repository, identityPermissionProvider });
    });

    describe('getMany', () => {
        it('should call preEvaluateOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.IDENTITY_PROVIDER_READ,
                    PermissionName.IDENTITY_PROVIDER_UPDATE,
                    PermissionName.IDENTITY_PROVIDER_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed({});
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create entity and propagate realm ids', async () => {
            const realmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: realmId };
                data.role = { realm_id: realmId, client_id: null };
            });

            const data = {
                provider_id: randomUUID(),
                role_id: randomUUID(),
            };

            const result = await service.create(data, createMasterRealmActor());
            expect(result.id).toBeDefined();
            expect(result.provider_realm_id).toBe(realmId);
            expect(result.role_realm_id).toBe(realmId);
        });

        it('should call preEvaluate with IDENTITY_PROVIDER_ROLE_CREATE', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: null };
                data.role = { realm_id: null, client_id: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                provider_id: randomUUID(),
                role_id: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    provider_id: randomUUID(),
                    role_id: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should throw ConflictError on duplicate provider_id + role_id', async () => {
            const providerId = randomUUID();
            const roleId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: null };
                data.role = { realm_id: null, client_id: null };
            });

            repository.seed({ provider_id: providerId, role_id: roleId });

            await expect(
                service.create({
                    provider_id: providerId,
                    role_id: roleId,
                }, createAllowAllActor()),
            ).rejects.toThrow(ConflictError);
        });

        it('should throw BadRequestError when provider and role are in different realms', async () => {
            const providerRealmId = randomUUID();
            const roleRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: providerRealmId };
                data.role = { realm_id: roleRealmId, client_id: null };
            });

            await expect(
                service.create({
                    provider_id: randomUUID(),
                    role_id: randomUUID(),
                }, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw validation error when provider_id is missing', async () => {
            await expect(
                service.create({ role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/provider_id/);
        });

        it('should throw validation error when role_id is missing', async () => {
            await expect(
                service.create({ provider_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/role_id/);
        });

        it('should throw validation error when provider_id is not a valid UUID', async () => {
            await expect(
                service.create({ provider_id: 'not-a-uuid', role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/provider_id/);
        });

        it('should throw ForbiddenError when superset check fails', async () => {
            const realmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: realmId };
                data.role = { realm_id: realmId, client_id: null };
            });

            identityPermissionProvider.isSuperset.mockResolvedValueOnce(false);

            await expect(
                service.create({
                    provider_id: randomUUID(),
                    role_id: randomUUID(),
                }, createMasterRealmActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('update', () => {
        it('should update optional fields', async () => {
            const entity = repository.seed({
                provider_id: randomUUID(),
                role_id: randomUUID(),
                name: 'old-name',
                value: 'old-value',
            });

            const result = await service.update(entity.id, { name: 'new-name', value: 'new-value' }, createAllowAllActor());
            expect(result.name).toBe('new-name');
            expect(result.value).toBe('new-value');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { name: 'test' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should call preEvaluate with IDENTITY_PROVIDER_ROLE_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.update(entity.id, { name: 'test' }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});
            await expect(
                service.update(entity.id, { name: 'test' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should not allow changing provider_id or role_id', async () => {
            const originalProviderId = randomUUID();
            const originalRoleId = randomUUID();
            const entity = repository.seed({
                provider_id: originalProviderId,
                role_id: originalRoleId,
            });

            const result = await service.update(
                entity.id,
                {
                    provider_id: randomUUID(), 
                    role_id: randomUUID(), 
                    name: 'updated', 
                },
                createAllowAllActor(),
            );
            expect(result.provider_id).toBe(originalProviderId);
            expect(result.role_id).toBe(originalRoleId);
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should call preEvaluate with IDENTITY_PROVIDER_ROLE_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.IDENTITY_PROVIDER_ROLE_DELETE });
        });
    });
});
