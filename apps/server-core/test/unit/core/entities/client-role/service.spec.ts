/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { ClientRole } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { ClientRoleService } from '../../../../../src/core/entities/client-role/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/client-role/service', () => {
    let repository: FakeEntityRepository<ClientRole>;
    let service: ClientRoleService;

    beforeEach(() => {
        repository = new FakeEntityRepository<ClientRole>();
        service = new ClientRoleService({ repository });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.CLIENT_ROLE_READ,
                    PermissionName.CLIENT_ROLE_UPDATE,
                    PermissionName.CLIENT_ROLE_DELETE,
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
            const data = {
                client_id: randomUUID(),
                role_id: randomUUID(),
                client: { realm_id: randomUUID() },
                role: { realm_id: randomUUID() },
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.client_realm_id).toBe(data.client.realm_id);
            expect(result.role_realm_id).toBe(data.role.realm_id);
        });

        it('should call preCheck with CLIENT_ROLE_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                client_id: randomUUID(),
                role_id: randomUUID(), 
            }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.CLIENT_ROLE_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    client_id: randomUUID(),
                    role_id: randomUUID(), 
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should call preCheck with CLIENT_ROLE_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.CLIENT_ROLE_DELETE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });
});
