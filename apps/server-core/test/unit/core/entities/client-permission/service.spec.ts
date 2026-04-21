/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { ClientPermission } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { ClientPermissionService } from '../../../../../src/core/entities/client-permission/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/client-permission/service', () => {
    let repository: FakeEntityRepository<ClientPermission>;
    let service: ClientPermissionService;

    beforeEach(() => {
        repository = new FakeEntityRepository<ClientPermission>();
        service = new ClientPermissionService({ repository });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.CLIENT_PERMISSION_CREATE,
                    PermissionName.CLIENT_PERMISSION_DELETE,
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
            const clientRealmId = randomUUID();
            const permissionRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.client = { realm_id: clientRealmId };
                data.permission = { realm_id: permissionRealmId, name: 'test-perm' };
            });

            const data = {
                client_id: randomUUID(),
                permission_id: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.client_realm_id).toBe(clientRealmId);
            expect(result.permission_realm_id).toBe(permissionRealmId);
        });

        it('should preCheck permission name when permission is provided', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realm_id: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                client_id: randomUUID(),
                permission_id: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should throw validation error when client_id is missing', async () => {
            await expect(
                service.create({ permission_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/client_id/);
        });

        it('should throw validation error when permission_id is missing', async () => {
            await expect(
                service.create({ client_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permission_id/);
        });

        it('should throw validation error when client_id is not a valid UUID', async () => {
            await expect(
                service.create({ client_id: 'not-a-uuid', permission_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/client_id/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    client_id: randomUUID(),
                    permission_id: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('update', () => {
        it('should update policy_id on an existing entity', async () => {
            const entity = repository.seed({ policy_id: null });
            const policyId = randomUUID();

            const result = await service.update(entity.id, { policy_id: policyId }, createAllowAllActor());
            expect(result.policy_id).toBe(policyId);
        });

        it('should clear policy_id when set to null', async () => {
            const entity = repository.seed({ policy_id: randomUUID() });

            const result = await service.update(entity.id, { policy_id: null }, createAllowAllActor());
            expect(result.policy_id).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { policy_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with CLIENT_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.update(entity.id, { policy_id: null }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.CLIENT_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});
            await expect(
                service.update(entity.id, { policy_id: randomUUID() }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should only update policy_id and not other fields', async () => {
            const originalClientId = randomUUID();
            const entity = repository.seed({ client_id: originalClientId, policy_id: null });
            const policyId = randomUUID();

            const result = await service.update(
                entity.id,
                { policy_id: policyId, client_id: randomUUID() },
                createAllowAllActor(),
            );
            expect(result.policy_id).toBe(policyId);
            expect(result.client_id).toBe(originalClientId);
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

        it('should call preCheck with CLIENT_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.CLIENT_PERMISSION_DELETE });
        });
    });
});
