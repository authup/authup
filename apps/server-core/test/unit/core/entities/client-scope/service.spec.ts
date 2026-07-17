/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { ClientScope } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { ClientScopeService } from '../../../../../src/core/entities/client-scope/service.ts';
import { FakeEntityRepository, createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';

describe('core/entities/client-scope/service', () => {
    let repository: FakeEntityRepository<ClientScope>;
    let service: ClientScopeService;

    beforeEach(() => {
        repository = new FakeEntityRepository<ClientScope>();
        service = new ClientScopeService({ repository });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with client permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.CLIENT_SCOPE_READ,
                    PermissionName.CLIENT_READ,
                    PermissionName.CLIENT_UPDATE,
                    PermissionName.CLIENT_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed({});
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('create', () => {
        it('should create entity and propagate realm ids', async () => {
            const clientRealmId = randomUUID();
            const scopeRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.client = { realmId: clientRealmId };
                data.scope = { realmId: scopeRealmId };
            });

            const data = {
                clientId: randomUUID(),
                scopeId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.clientRealmId).toBe(clientRealmId);
            expect(result.scopeRealmId).toBe(scopeRealmId);
        });

        it('should call preCheck with CLIENT_SCOPE_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                clientId: randomUUID(),
                scopeId: randomUUID(), 
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_SCOPE_CREATE });
        });

        it('should throw validation error when clientId is missing', async () => {
            await expect(
                service.create({ scopeId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/clientId/);
        });

        it('should throw validation error when scopeId is missing', async () => {
            await expect(
                service.create({ clientId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/scopeId/);
        });

        it('should throw validation error when clientId is not a valid UUID', async () => {
            await expect(
                service.create({ clientId: 'not-a-uuid', scopeId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/clientId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    clientId: randomUUID(),
                    scopeId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const clientId = randomUUID();
            const scopeId = randomUUID();

            repository.seed({ clientId, scopeId });

            await expect(
                service.create({ clientId, scopeId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with CLIENT_SCOPE_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_SCOPE_DELETE });
        });
    });
});
