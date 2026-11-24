/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { ClientPermission, Permission } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { ClientPermissionService } from '../../../../../src/core/entities/client-permission/service.ts';
import { FakeEntityRepository, createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';
import {
    FakeIdentityPermissionProvider,
    createClientMatchActor,
    readEvaluatedRecordRealms,
    withHeldPermissions,
} from '../../helpers/index.ts';

describe('core/entities/client-permission/service', () => {
    let repository: FakeEntityRepository<ClientPermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let service: ClientPermissionService;

    beforeEach(() => {
        // a stored junction row always carries its owner realm column, and a
        // create stamps it from the join-loaded owner
        repository = new FakeEntityRepository<ClientPermission>({ defaults: { clientRealmId: null } });
        repository.onValidateJoinColumns((data: any) => {
            data.client = { realmId: null };
        });
        permissionRepository = new FakeEntityRepository<Permission>();
        service = new ClientPermissionService({
            repository,
            permissionRepository,
            identityPermissionProvider: new FakeIdentityPermissionProvider(),
        });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();

            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.CLIENT_PERMISSION_CREATE,
                    PermissionName.CLIENT_PERMISSION_DELETE,
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
            const permissionRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.client = { realmId: clientRealmId };
                data.permission = { realmId: permissionRealmId, name: 'test-perm' };
            });

            const data = {
                clientId: randomUUID(),
                permissionId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());

            expect(result.id).toBeDefined();
            expect(result.clientRealmId).toBe(clientRealmId);
            expect(result.permissionRealmId).toBe(permissionRealmId);
        });

        it('should preCheck permission name when permission is provided', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.client = { realmId: null };
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const actor = createAllowAllActor();

            await service.create({
                clientId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should throw validation error when clientId is missing', async () => {
            await expect(
                service.create({ permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/clientId/);
        });

        it('should throw validation error when permissionId is missing', async () => {
            await expect(
                service.create({ clientId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permissionId/);
        });

        it('should throw validation error when clientId is not a valid UUID', async () => {
            await expect(
                service.create({ clientId: 'not-a-uuid', permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/clientId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    clientId: randomUUID(),
                    permissionId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const clientId = randomUUID();
            const permissionId = randomUUID();

            repository.seed({ clientId, permissionId });

            await expect(
                service.create({ clientId, permissionId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });
    });

    describe('update reach (#3654)', () => {
        const restrict = () => {
            const actor = createAllowAllActor();

            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method !== 'evaluate' || call.ctx.name !== PermissionName.CLIENT_PERMISSION_UPDATE) {
                    return;
                }

                const attributes = call.ctx.data!.get<Record<string, any>>(BuiltInPolicyType.ATTRIBUTES);

                if (attributes.policyId !== '11111111-1111-4111-8111-111111111111') {
                    throw PermissionError.denied('test');
                }
            });

            return actor;
        };

        it('should evaluate the stored and the updated row in the owner realm', async () => {
            const ownerRealmId = randomUUID();
            const entity = repository.seed({
                clientRealmId: ownerRealmId,
                permissionRealmId: randomUUID(),
                policyId: null,
            });
            const actor = createAllowAllActor();

            await service.update(entity.id, { policyId: null }, actor);
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.CLIENT_PERMISSION_UPDATE))
                .toEqual([ownerRealmId, ownerRealmId]);
        });

        it('should refuse moving an unreachable row into reach', async () => {
            const entity = repository.seed({ policyId: '22222222-2222-4222-8222-222222222222' });

            await expect(service.update(entity.id, { policyId: '11111111-1111-4111-8111-111111111111' }, restrict())).rejects.toBeInstanceOf(PermissionError);
        });

        it('should allow updating a row that stays in reach', async () => {
            const entity = repository.seed({ policyId: '11111111-1111-4111-8111-111111111111' });

            await expect(service.update(entity.id, { policyId: '11111111-1111-4111-8111-111111111111' }, restrict())).resolves.toBeDefined();
        });

        it('should refuse moving a reachable row out of reach', async () => {
            const entity = repository.seed({ policyId: '11111111-1111-4111-8111-111111111111' });

            await expect(service.update(entity.id, { policyId: '22222222-2222-4222-8222-222222222222' }, restrict())).rejects.toBeInstanceOf(PermissionError);
        });
    });

    describe('update', () => {
        it('should update policyId on an existing entity', async () => {
            const entity = repository.seed({ policyId: null });
            const policyId = randomUUID();

            const result = await service.update(entity.id, { policyId }, createAllowAllActor());

            expect(result.policyId).toBe(policyId);
        });

        it('should clear policyId when set to null', async () => {
            const entity = repository.seed({ policyId: randomUUID() });

            const result = await service.update(entity.id, { policyId: null }, createAllowAllActor());

            expect(result.policyId).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { policyId: randomUUID() }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with CLIENT_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();

            await service.update(entity.id, { policyId: null }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});

            await expect(
                service.update(entity.id, { policyId: randomUUID() }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should only update policyId and not other fields', async () => {
            const originalClientId = randomUUID();
            const entity = repository.seed({ clientId: originalClientId, policyId: null });
            const policyId = randomUUID();

            const result = await service.update(
                entity.id,
                { policyId, clientId: randomUUID() },
                createAllowAllActor(),
            );

            expect(result.policyId).toBe(policyId);
            expect(result.clientId).toBe(originalClientId);
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

        it('should call preCheck with CLIENT_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();

            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_PERMISSION_DELETE });
        });
    });
});

describe('core/entities/client-permission/service: owning client (clientMatch)', () => {
    const realmId = randomUUID();
    const clientId = randomUUID();
    const otherClientId = randomUUID();

    const names = [
        PermissionName.CLIENT_PERMISSION_CREATE,
        PermissionName.CLIENT_PERMISSION_UPDATE,
        PermissionName.CLIENT_PERMISSION_DELETE,
    ];

    let repository: FakeEntityRepository<ClientPermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let service: ClientPermissionService;

    let owned: Permission;
    let foreign: Permission;
    let global: Permission;

    beforeEach(() => {
        repository = new FakeEntityRepository<ClientPermission>({ defaults: { clientRealmId: realmId } });
        permissionRepository = new FakeEntityRepository<Permission>();
        service = new ClientPermissionService({
            repository,
            permissionRepository,
            identityPermissionProvider: new FakeIdentityPermissionProvider(),
        });

        [owned, foreign, global] = permissionRepository.seed([
            {
                name: 'owned', 
                realmId, 
                clientId, 
            },
            {
                name: 'foreign', 
                realmId, 
                clientId: otherClientId, 
            },
            {
                name: 'global', 
                realmId: null, 
                clientId: null, 
            },
        ]);

        repository.onValidateJoinColumns((data: any) => {
            data.client = { realmId };
            data.permission = permissionRepository.getAll().find((permission) => permission.id === data.permissionId);
        });
    });

    const createActor = async () => withHeldPermissions(
        await createClientMatchActor({
            clientId, 
            realmId, 
            names, 
        }),
        names,
    );

    // the receiving client is the actor itself, which must not count as ownership
    const bind = (permission: Permission) => repository.seed({
        clientId,
        permissionId: permission.id,
        permissionRealmId: permission.realmId,
    });

    it('should bind an owned permission only', async () => {
        const actor = await createActor();

        await expect(service.create({ clientId: randomUUID(), permissionId: owned.id }, actor)).resolves.toBeDefined();
        await expect(service.create({ clientId: randomUUID(), permissionId: foreign.id }, actor))
            .rejects.toThrow(PermissionError);
        await expect(service.create({ clientId: randomUUID(), permissionId: global.id }, actor))
            .rejects.toThrow(PermissionError);
    });

    it('should read a binding of an owned permission only', async () => {
        const actor = await createActor();
        const ownedBinding = bind(owned);

        expect((await service.getOne(ownedBinding.id, actor)).id).toEqual(ownedBinding.id);
        await expect(service.getOne(bind(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.getOne(bind(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should list bindings of owned permissions only, with one lookup', async () => {
        bind(owned);
        bind(foreign);
        bind(global);
        bind(owned);

        const lookup = vi.spyOn(permissionRepository, 'findManyBy');

        const result = await service.getMany({}, await createActor());

        expect(result.data.map((row) => row.permissionId)).toEqual([owned.id, owned.id]);
        expect(lookup).toHaveBeenCalledTimes(1);
    });

    it('should update a binding of an owned permission only', async () => {
        const actor = await createActor();

        await expect(service.update(bind(owned).id, { policyId: null }, actor)).resolves.toBeDefined();
        await expect(service.update(bind(foreign).id, { policyId: null }, actor)).rejects.toThrow(PermissionError);
    });

    it('should delete a binding of an owned permission only', async () => {
        const actor = await createActor();

        await expect(service.delete(bind(owned).id, actor)).resolves.toBeDefined();
        await expect(service.delete(bind(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.delete(bind(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should carry the owner on every record check', async () => {
        const actor = createAllowAllActor();
        const foreignBinding = bind(foreign);

        await service.getMany({}, actor);
        await service.getOne(foreignBinding.id, actor);
        await service.create({ clientId: randomUUID(), permissionId: owned.id }, actor);
        await service.update(foreignBinding.id, { policyId: null }, actor);
        await service.delete(bind(global).id, actor);

        const owners = [
            ...actor.permissionEvaluator.evaluateOneOfCalls,
            ...actor.permissionEvaluator.evaluateCalls,
        ].map((call) => call.data!.get(BuiltInPolicyType.CLIENT_MATCH));

        expect(owners).not.toContain(undefined);
        expect(owners).toContain(clientId);
        expect(owners).toContain(otherClientId);
        expect(owners).toContain(null);
    });
});
