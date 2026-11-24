/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    PermissionName,
    ROLE_ADMIN_NAME,
} from '@authup/core-kit';
import type { Permission, Role, RolePermission } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { BuiltInPolicyType, PermissionError, RealmScope } from '@authup/access';
import { RolePermissionService } from '../../../../../src/core/entities/role-permission/service.ts';
import {
    FakeEntityRepository,
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import {
    FakeIdentityPermissionProvider,
    createClientMatchActor,
    createIdentityPermissionProvider,
    readEvaluatedRecordRealms,
    withHeldPermissions,
} from '../../helpers/index.ts';

describe('core/entities/role-permission/service', () => {
    let repository: FakeEntityRepository<RolePermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let service: RolePermissionService;

    beforeEach(() => {
        // a stored junction row always carries its owner realm column, and a
        // create stamps it from the join-loaded owner
        repository = new FakeEntityRepository<RolePermission>({ defaults: { roleRealmId: null } });
        repository.onValidateJoinColumns((data: any) => {
            data.role = { realmId: null };
        });
        permissionRepository = new FakeEntityRepository<Permission>();
        service = new RolePermissionService({
            repository,
            permissionRepository,
            roleRepository: new FakeEntityRepository<Role>(),
            identityPermissionProvider: new FakeIdentityPermissionProvider(),
        });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([{}]);

            const result = await service.getMany({}, createAllowAllActor());

            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();

            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.ROLE_PERMISSION_DELETE,
                    PermissionName.ROLE_PERMISSION_READ,
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
            const roleRealmId = randomUUID();
            const permissionRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: roleRealmId };
                data.permission = { realmId: permissionRealmId, name: 'test-perm' };
            });

            const data = {
                roleId: randomUUID(),
                permissionId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());

            expect(result.id).toBeDefined();
            expect(result.roleRealmId).toBe(roleRealmId);
            expect(result.permissionRealmId).toBe(permissionRealmId);
        });

        it('should call preCheck with ROLE_PERMISSION_CREATE', async () => {
            const actor = createAllowAllActor();

            await service.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_PERMISSION_CREATE });
        });

        it('should preCheck permission name when permission is provided', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: null };
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const actor = createAllowAllActor();

            await service.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should run the permission name preCheck uniformly for the admin role (no bypass)', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.role = { name: ROLE_ADMIN_NAME, realmId: null };
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const actor = createAllowAllActor();

            await service.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('caps realmScope to the actor ceiling and ignores explicit policyId for a restricted actor', async () => {
            const provider = new FakeIdentityPermissionProvider();

            provider.setJunctionRealmScope(RealmScope.OWN);
            provider.setJunctionPolicy(undefined);

            const scopedService = new RolePermissionService({
                repository,
                permissionRepository,
                roleRepository: new FakeEntityRepository<Role>(),
                identityPermissionProvider: provider,
            });

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: null };
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const result = await scopedService.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
                realmScope: 'any',
                policyId: randomUUID(),
            }, createNonMasterRealmActor());

            // restricted (own) actor: requested 'any' capped to 'own', explicit policyId ignored.
            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policyId).toBeNull();
        });

        it('lets an any-scoped actor set a broader realmScope', async () => {
            const provider = new FakeIdentityPermissionProvider();

            provider.setJunctionRealmScope(RealmScope.ANY);

            const scopedService = new RolePermissionService({
                repository,
                permissionRepository,
                roleRepository: new FakeEntityRepository<Role>(),
                identityPermissionProvider: provider,
            });

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: null };
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const result = await scopedService.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
                realmScope: 'ownOrNull',
            }, createNonMasterRealmActor());

            expect(result.realmScope).toBe(RealmScope.OWN_OR_NULL);
        });

        it('should throw validation error when roleId is missing', async () => {
            await expect(
                service.create({ permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/roleId/);
        });

        it('should throw validation error when permissionId is missing', async () => {
            await expect(
                service.create({ roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permissionId/);
        });

        it('should throw validation error when roleId is not a valid UUID', async () => {
            await expect(
                service.create({ roleId: 'not-a-uuid', permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/roleId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    roleId: randomUUID(),
                    permissionId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const roleId = randomUUID();
            const permissionId = randomUUID();

            repository.seed({ roleId, permissionId });

            await expect(
                service.create({ roleId, permissionId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });
    });

    describe('update reach (#3654)', () => {
        const restrict = () => {
            const actor = createAllowAllActor();

            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method !== 'evaluate' || call.ctx.name !== PermissionName.ROLE_PERMISSION_UPDATE) {
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
                roleRealmId: ownerRealmId,
                permissionRealmId: randomUUID(),
                policyId: null,
            });
            const actor = createAllowAllActor();

            await service.update(entity.id, { policyId: null }, actor);
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.ROLE_PERMISSION_UPDATE))
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
            const policyId = randomUUID();
            const entity = repository.seed({ policyId });

            const result = await service.update(entity.id, { policyId: null }, createAllowAllActor());

            expect(result.policyId).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { policyId: randomUUID() }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with ROLE_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();

            await service.update(entity.id, { policyId: null }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});

            await expect(
                service.update(entity.id, { policyId: randomUUID() }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should only update policyId and not other fields', async () => {
            const originalRoleId = randomUUID();
            const entity = repository.seed({ roleId: originalRoleId, policyId: null });
            const policyId = randomUUID();

            const result = await service.update(
                entity.id,
                { policyId, roleId: randomUUID() },
                createAllowAllActor(),
            );

            expect(result.policyId).toBe(policyId);
            expect(result.roleId).toBe(originalRoleId);
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

        it('should call preCheck with ROLE_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();

            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_PERMISSION_DELETE });
        });
    });
});

describe('core/entities/role-permission/service: owning client (clientMatch)', () => {
    const realmId = randomUUID();
    const clientId = randomUUID();
    const otherClientId = randomUUID();

    const names = [
        PermissionName.ROLE_PERMISSION_CREATE,
        PermissionName.ROLE_PERMISSION_READ,
        PermissionName.ROLE_PERMISSION_UPDATE,
        PermissionName.ROLE_PERMISSION_DELETE,
    ];

    let repository: FakeEntityRepository<RolePermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let roleRepository: FakeEntityRepository<Role>;
    let service: RolePermissionService;

    let permission: Permission;
    let owned: Role;
    let foreign: Role;
    let global: Role;

    beforeEach(() => {
        repository = new FakeEntityRepository<RolePermission>();
        permissionRepository = new FakeEntityRepository<Permission>();
        roleRepository = new FakeEntityRepository<Role>();
        service = new RolePermissionService({
            repository,
            permissionRepository,
            roleRepository,
            identityPermissionProvider: new FakeIdentityPermissionProvider(),
        });

        permission = permissionRepository.seed({
            name: 'owned', 
            realmId, 
            clientId, 
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
            data.role = roleRepository.getAll().find((role) => role.id === data.roleId);
            data.permission = permissionRepository.getAll().find((entry) => entry.id === data.permissionId);
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

    // a global role cannot sit in the actor's realm, so it is bound in it to
    // prove the owner gate refuses it, not the realm gate
    const bind = (role: Role) => repository.seed({
        roleId: role.id,
        roleRealmId: realmId,
        permissionId: permission.id,
        permissionRealmId: permission.realmId,
    });

    it('should bind a permission to an owned role only', async () => {
        const actor = await createActor();

        await expect(service.create({ roleId: owned.id, permissionId: permission.id }, actor)).resolves.toBeDefined();
        await expect(service.create({ roleId: foreign.id, permissionId: permission.id }, actor))
            .rejects.toThrow(PermissionError);
    });

    it('should read a binding of an owned role only', async () => {
        const actor = await createActor();
        const ownedBinding = bind(owned);

        expect((await service.getOne(ownedBinding.id, actor)).id).toEqual(ownedBinding.id);
        await expect(service.getOne(bind(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.getOne(bind(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should list bindings of owned roles only, with one lookup', async () => {
        bind(owned);
        bind(foreign);
        bind(global);
        bind(owned);

        const lookup = vi.spyOn(roleRepository, 'findManyBy');

        const result = await service.getMany({}, await createActor());

        expect(result.data.map((row) => row.roleId)).toEqual([owned.id, owned.id]);
        expect(lookup).toHaveBeenCalledTimes(1);
    });

    it('should update a binding of an owned role only', async () => {
        const actor = await createActor();

        await expect(service.update(bind(owned).id, { policyId: null }, actor)).resolves.toBeDefined();
        await expect(service.update(bind(foreign).id, { policyId: null }, actor)).rejects.toThrow(PermissionError);
    });

    it('should delete a binding of an owned role only', async () => {
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
        await service.create({ roleId: owned.id, permissionId: permission.id }, actor);
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

describe('core/entities/role-permission/service: a manager delegates owned permissions (#3907)', () => {
    const realmId = randomUUID();
    const clientId = randomUUID();
    const otherClientId = randomUUID();
    const policyId = randomUUID();

    const names = [
        PermissionName.ROLE_PERMISSION_CREATE,
        PermissionName.ROLE_PERMISSION_UPDATE,
        PermissionName.PERMISSION_UPDATE,
    ];

    let repository: FakeEntityRepository<RolePermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let roleRepository: FakeEntityRepository<Role>;
    let service: RolePermissionService;

    let owned: Permission;
    let foreign: Permission;
    let global: Permission;
    let role: Role;
    let foreignRole: Role;

    beforeEach(() => {
        repository = new FakeEntityRepository<RolePermission>();
        permissionRepository = new FakeEntityRepository<Permission>();
        roleRepository = new FakeEntityRepository<Role>();
        service = new RolePermissionService({
            repository,
            permissionRepository,
            roleRepository,
            identityPermissionProvider: createIdentityPermissionProvider(),
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

        [role, foreignRole] = roleRepository.seed([
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
        ]);

        repository.onValidateJoinColumns((data: any) => {
            data.role = roleRepository.getAll().find((entry) => entry.id === data.roleId);
            data.permission = permissionRepository.getAll().find((entry) => entry.id === data.permissionId);
        });
    });

    const createActor = (held: string[] = names) => createClientMatchActor({
        clientId,
        realmId,
        names: held,
    });

    it('should bind an owned permission it does not hold to an owned role, capped to the manager reach', async () => {
        const entity = await service.create({
            roleId: role.id,
            permissionId: owned.id,
            realmScope: RealmScope.ANY,
            policyId,
        }, await createActor());

        expect(entity.realmScope).toEqual(RealmScope.OWN);
        expect(entity.policyId).toEqual(policyId);
    });

    it('should not bind an owned permission to a role another client owns', async () => {
        await expect(service.create({ roleId: foreignRole.id, permissionId: owned.id }, await createActor()))
            .rejects.toThrow(PermissionError);
    });

    it('should not bind an owned permission without managing permissions', async () => {
        const actor = await createActor(names.filter((name) => name !== PermissionName.PERMISSION_UPDATE));

        await expect(service.create({ roleId: role.id, permissionId: owned.id }, actor))
            .rejects.toThrow(PermissionError);
    });

    it('should not bind a permission another client owns', async () => {
        await expect(service.create({ roleId: role.id, permissionId: foreign.id }, await createActor()))
            .rejects.toThrow(PermissionError);
    });

    it('should not bind a global permission it does not hold', async () => {
        await expect(service.create({ roleId: role.id, permissionId: global.id }, await createActor()))
            .rejects.toThrow(PermissionError);
    });

    it('should update a binding of an owned permission, capped to the manager reach', async () => {
        const binding = repository.seed({
            roleId: role.id,
            roleRealmId: realmId,
            permissionId: owned.id,
            permissionRealmId: realmId,
            realmScope: RealmScope.ANY,
            policyId: null,
        });

        const entity = await service.update(binding.id, { policyId }, await createActor());

        expect(entity.realmScope).toEqual(RealmScope.OWN);
        expect(entity.policyId).toEqual(policyId);
    });

    it('should not update a binding of a permission another client owns', async () => {
        const binding = repository.seed({
            roleId: role.id,
            roleRealmId: realmId,
            permissionId: foreign.id,
            permissionRealmId: realmId,
        });

        await expect(service.update(binding.id, { policyId }, await createActor()))
            .rejects.toThrow(PermissionError);
    });
});
