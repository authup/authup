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
import { ConflictError, ForbiddenError, NotFoundError } from '@ebec/http';
import { ClientScopeService } from '../../../../../src/core/entities/client-scope/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/fake-actor.ts';

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
            const scopeRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.client = { realm_id: clientRealmId };
                data.scope = { realm_id: scopeRealmId };
            });

            const data = {
                client_id: randomUUID(),
                scope_id: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.client_realm_id).toBe(clientRealmId);
            expect(result.scope_realm_id).toBe(scopeRealmId);
        });

        it('should call preCheck with CLIENT_SCOPE_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                client_id: randomUUID(),
                scope_id: randomUUID(), 
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_SCOPE_CREATE });
        });

        it('should throw validation error when client_id is missing', async () => {
            await expect(
                service.create({ scope_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/client_id/);
        });

        it('should throw validation error when scope_id is missing', async () => {
            await expect(
                service.create({ client_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/scope_id/);
        });

        it('should throw validation error when client_id is not a valid UUID', async () => {
            await expect(
                service.create({ client_id: 'not-a-uuid', scope_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/client_id/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    client_id: randomUUID(),
                    scope_id: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const clientId = randomUUID();
            const scopeId = randomUUID();

            repository.seed({ client_id: clientId, scope_id: scopeId });

            await expect(
                service.create({ client_id: clientId, scope_id: scopeId }, createAllowAllActor()),
            ).rejects.toThrow(ConflictError);
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

        it('should call preCheck with CLIENT_SCOPE_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_SCOPE_DELETE });
        });
    });
});
