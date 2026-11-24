/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { ClientRole, Role } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { ClientRoleService } from '../../../../../src/core/entities/client-role/service.ts';
import {
    FakeEntityRepository,
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
} from '@authup/server-test-kit';
import { FakeIdentityPermissionProvider } from '../../helpers/fake-identity-permission-provider.ts';
import { createClientMatchActor } from '../../helpers/index.ts';

describe('core/entities/client-role/service', () => {
    let repository: FakeEntityRepository<ClientRole>;
    let service: ClientRoleService;

    let identityPermissionProvider: FakeIdentityPermissionProvider;

    beforeEach(() => {
        // a stored junction row always carries its owner realm column, and a
        // create stamps it from the join-loaded owner
        repository = new FakeEntityRepository<ClientRole>({ defaults: { clientRealmId: null } });
        repository.onValidateJoinColumns((data: any) => {
            data.client = { realmId: null };
        });
        identityPermissionProvider = new FakeIdentityPermissionProvider();
        service = new ClientRoleService({
            repository, 
            roleRepository: new FakeEntityRepository<Role>(), 
            identityPermissionProvider, 
        });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();

            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.CLIENT_ROLE_READ,
                    PermissionName.CLIENT_ROLE_UPDATE,
                    PermissionName.CLIENT_ROLE_DELETE,
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
            const roleRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.client = { realmId: clientRealmId };
                data.role = { realmId: roleRealmId };
            });

            const data = {
                clientId: randomUUID(),
                roleId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());

            expect(result.id).toBeDefined();
            expect(result.clientRealmId).toBe(clientRealmId);
            expect(result.roleRealmId).toBe(roleRealmId);
        });

        it('should run the superset check with the actor\'s evaluator', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.client = { realmId: null };
                data.role = { realmId: null, clientId: null };
            });

            const actor = createMasterRealmActor();

            await service.create({
                clientId: randomUUID(),
                roleId: randomUUID(),
            }, actor);

            expect(identityPermissionProvider.supersetActors).toEqual([
                expect.objectContaining({ permissionEvaluator: actor.permissionEvaluator }),
            ]);
        });

        it('should call preCheck with CLIENT_ROLE_CREATE', async () => {
            const actor = createAllowAllActor();

            await service.create({
                clientId: randomUUID(),
                roleId: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_ROLE_CREATE });
        });

        it('should throw validation error when clientId is missing', async () => {
            await expect(
                service.create({ roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/clientId/);
        });

        it('should throw validation error when roleId is missing', async () => {
            await expect(
                service.create({ clientId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/roleId/);
        });

        it('should throw validation error when clientId is not a valid UUID', async () => {
            await expect(
                service.create({ clientId: 'not-a-uuid', roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/clientId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    clientId: randomUUID(),
                    roleId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ForbiddenError when actor does not own role permissions (superset check)', async () => {
            const identityPermissionProviderDeny = new FakeIdentityPermissionProvider();

            identityPermissionProviderDeny.setSuperset(false);

            const svc = new ClientRoleService({
                repository, 
                roleRepository: new FakeEntityRepository<Role>(), 
                identityPermissionProvider: identityPermissionProviderDeny, 
            });

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: null, clientId: null };
                data.client = { realmId: null };
            });

            await expect(
                svc.create({
                    clientId: randomUUID(),
                    roleId: randomUUID(),
                }, createMasterRealmActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const roleId = randomUUID();
            const clientId = randomUUID();

            repository.seed({ roleId, clientId });

            await expect(
                service.create({ roleId, clientId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
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
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_ROLE_DELETE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });
});

describe('core/entities/client-role/service: owning client (clientMatch)', () => {
    const realmId = randomUUID();
    const clientId = randomUUID();
    const otherClientId = randomUUID();

    const names = [
        PermissionName.CLIENT_ROLE_CREATE,
        PermissionName.CLIENT_ROLE_READ,
        PermissionName.CLIENT_ROLE_UPDATE,
        PermissionName.CLIENT_ROLE_DELETE,
    ];

    let repository: FakeEntityRepository<ClientRole>;
    let roleRepository: FakeEntityRepository<Role>;
    let service: ClientRoleService;

    let owned: Role;
    let foreign: Role;
    let global: Role;

    beforeEach(() => {
        repository = new FakeEntityRepository<ClientRole>({ defaults: { clientRealmId: realmId } });
        roleRepository = new FakeEntityRepository<Role>();
        service = new ClientRoleService({
            repository,
            roleRepository,
            identityPermissionProvider: new FakeIdentityPermissionProvider(),
        });

        [owned, foreign, global] = roleRepository.seed([
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
            data.role = roleRepository.getAll().find((role) => role.id === data.roleId);
        });
    });

    const createActor = () => createClientMatchActor({
        clientId, 
        realmId, 
        names, 
    });

    const bind = (role: Role) => repository.seed({
        clientId: randomUUID(),
        roleId: role.id,
        roleRealmId: role.realmId,
    });

    it('should assign an owned role only', async () => {
        const actor = await createActor();

        await expect(service.create({ clientId: randomUUID(), roleId: owned.id }, actor)).resolves.toBeDefined();
        await expect(service.create({ clientId: randomUUID(), roleId: foreign.id }, actor))
            .rejects.toThrow(PermissionError);
        await expect(service.create({ clientId: randomUUID(), roleId: global.id }, actor))
            .rejects.toThrow(PermissionError);
    });

    it('should read an assignment of an owned role only', async () => {
        const actor = await createActor();
        const ownedBinding = bind(owned);

        expect((await service.getOne(ownedBinding.id, actor)).id).toEqual(ownedBinding.id);
        await expect(service.getOne(bind(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.getOne(bind(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should list assignments of owned roles only, with one lookup', async () => {
        bind(owned);
        bind(foreign);
        bind(global);
        bind(owned);

        const lookup = vi.spyOn(roleRepository, 'findManyBy');

        const result = await service.getMany({}, await createActor());

        expect(result.data.map((row) => row.roleId)).toEqual([owned.id, owned.id]);
        expect(lookup).toHaveBeenCalledTimes(1);
    });

    it('should delete an assignment of an owned role only', async () => {
        const actor = await createActor();

        await expect(service.delete(bind(owned).id, actor)).resolves.toBeDefined();
        await expect(service.delete(bind(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.delete(bind(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should carry the owner on every record check', async () => {
        const actor = createAllowAllActor();

        await service.getMany({}, actor);
        await service.getOne(bind(foreign).id, actor);
        await service.create({ clientId: randomUUID(), roleId: owned.id }, actor);
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
