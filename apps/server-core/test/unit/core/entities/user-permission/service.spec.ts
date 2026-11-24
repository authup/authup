/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { Permission, UserPermission } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { BuiltInPolicyType, PermissionError, RealmScope } from '@authup/access';
import { UserPermissionService } from '../../../../../src/core/entities/user-permission/service.ts';
import {
    FakeEntityRepository,
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
} from '@authup/server-test-kit';
import {
    FakeIdentityPermissionProvider,
    createClientMatchActor,
    createIdentityPermissionProvider,
    readEvaluatedRecordRealms,
    withHeldPermissions,
} from '../../helpers/index.ts';

describe('core/entities/user-permission/service', () => {
    let repository: FakeEntityRepository<UserPermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let identityPermissionProvider: FakeIdentityPermissionProvider;
    let service: UserPermissionService;

    beforeEach(() => {
        // a stored junction row always carries its owner realm column, and a
        // create stamps it from the join-loaded owner
        repository = new FakeEntityRepository<UserPermission>({ defaults: { userRealmId: null } });
        repository.onValidateJoinColumns((data: any) => {
            data.user = { realmId: null };
        });
        permissionRepository = new FakeEntityRepository<Permission>();
        identityPermissionProvider = new FakeIdentityPermissionProvider();
        service = new UserPermissionService({
            repository,
            permissionRepository,
            identityPermissionProvider,
        });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();

            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.USER_PERMISSION_CREATE,
                    PermissionName.USER_PERMISSION_DELETE,
                    PermissionName.USER_PERMISSION_READ,
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
            const userRealmId = randomUUID();
            const permissionRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.user = { realmId: userRealmId };
                data.permission = { realmId: permissionRealmId, name: 'test-perm' };
            });

            const data = {
                userId: randomUUID(),
                permissionId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());

            expect(result.id).toBeDefined();
            expect(result.userRealmId).toBe(userRealmId);
            expect(result.permissionRealmId).toBe(permissionRealmId);
        });

        it('should preCheck permission name when permission is provided', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.user = { realmId: null };
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const actor = createAllowAllActor();

            await service.create({
                userId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should throw validation error when userId is missing', async () => {
            await expect(
                service.create({ permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/userId/);
        });

        it('should throw validation error when permissionId is missing', async () => {
            await expect(
                service.create({ userId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permissionId/);
        });

        it('should throw validation error when userId is not a valid UUID', async () => {
            await expect(
                service.create({ userId: 'not-a-uuid', permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/userId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    userId: randomUUID(),
                    permissionId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const permissionId = randomUUID();
            const userId = randomUUID();

            repository.seed({ permissionId, userId });

            await expect(
                service.create({ permissionId, userId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });
    });

    describe('update reach (#3654)', () => {
        const restrict = () => {
            const actor = createAllowAllActor();

            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method !== 'evaluate' || call.ctx.name !== PermissionName.USER_PERMISSION_UPDATE) {
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
                userRealmId: ownerRealmId,
                permissionRealmId: randomUUID(),
                policyId: null,
            });
            const actor = createAllowAllActor();

            await service.update(entity.id, { policyId: null }, actor);
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.USER_PERMISSION_UPDATE))
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

        it('should call preCheck with USER_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();

            await service.update(entity.id, { policyId: null }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});

            await expect(
                service.update(entity.id, { policyId: randomUUID() }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should only update policyId and not other fields', async () => {
            const originalUserId = randomUUID();
            const entity = repository.seed({ userId: originalUserId, policyId: null });
            const policyId = randomUUID();

            const result = await service.update(
                entity.id,
                { policyId, userId: randomUUID() },
                createAllowAllActor(),
            );

            expect(result.policyId).toBe(policyId);
            expect(result.userId).toBe(originalUserId);
        });

        // #3160 review: a restricted actor (holds only `own`, no policy) must NOT be able to
        // strip the policy off a wider pre-existing `any` binding while keeping `any` reach.
        // A policy-only update has to re-cap the existing scope down to the actor's grant.
        it('re-caps a wider existing realmScope on a policy-only update by a restricted actor', async () => {
            identityPermissionProvider.setJunctionRealmScope(RealmScope.OWN);
            identityPermissionProvider.setJunctionPolicy(undefined);

            const permission = permissionRepository.seed({ name: 'user_read', realmId: null });
            const entity = repository.seed({
                permissionId: permission.id,
                realmScope: RealmScope.ANY,
                policyId: randomUUID(),
            });

            const result = await service.update(entity.id, { policyId: null }, createMasterRealmActor());

            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policyId).toBeNull();
        });

        // The asymmetry: an unrestricted (`any`, policy-free) actor may drop the policy off a
        // wide binding WITHOUT its reach being narrowed.
        it('lets an unrestricted actor drop policy on a wide binding without narrowing reach', async () => {
            identityPermissionProvider.setJunctionRealmScope(RealmScope.ANY);
            identityPermissionProvider.setJunctionPolicy(undefined);

            const permission = permissionRepository.seed({ name: 'user_read', realmId: null });
            const entity = repository.seed({
                permissionId: permission.id,
                realmScope: RealmScope.ANY,
                policyId: randomUUID(),
            });

            const result = await service.update(entity.id, { policyId: null }, createMasterRealmActor());

            expect(result.realmScope).toBe(RealmScope.ANY);
            expect(result.policyId).toBeNull();
        });

        // Member-permission gate parity with create(): an actor may only modify a binding for a
        // permission it itself holds.
        it('runs the member-permission gate on update', async () => {
            const permission = permissionRepository.seed({ name: 'user_read', realmId: null });
            const entity = repository.seed({ permissionId: permission.id, policyId: null });
            const actor = createMasterRealmActor();

            await service.update(entity.id, { policyId: null }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual(
                expect.objectContaining({ name: 'user_read' }),
            );
        });

        it('rejects a malformed realmScope on update (validator no longer silently coerces)', async () => {
            const entity = repository.seed({ policyId: null });

            await expect(
                service.update(entity.id, { realmScope: 'superadmin' }, createAllowAllActor()),
            ).rejects.toThrow(/realmScope/);
        });

        it('rejects a non-UUID policyId on update', async () => {
            const entity = repository.seed({ policyId: null });

            await expect(
                service.update(entity.id, { policyId: 'not-a-uuid' }, createAllowAllActor()),
            ).rejects.toThrow(/policyId/);
        });

        it('blocks the update when the actor lacks the member permission', async () => {
            const permission = permissionRepository.seed({ name: 'user_read', realmId: null });
            const entity = repository.seed({ permissionId: permission.id, policyId: null });

            const actor = createMasterRealmActor();

            actor.permissionEvaluator.setBehavior(({ method, ctx }) => {
                if (method === 'preEvaluate' && ctx.name === 'user_read') {
                    throw new Error('member-denied');
                }
            });

            await expect(
                service.update(entity.id, { policyId: randomUUID() }, actor),
            ).rejects.toThrow('member-denied');
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

        it('should call preCheck with USER_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();

            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_PERMISSION_DELETE });
        });
    });
});

describe('core/entities/user-permission/service: owning client (clientMatch)', () => {
    const realmId = randomUUID();
    const clientId = randomUUID();
    const otherClientId = randomUUID();

    const names = [
        PermissionName.USER_PERMISSION_CREATE,
        PermissionName.USER_PERMISSION_READ,
        PermissionName.USER_PERMISSION_UPDATE,
        PermissionName.USER_PERMISSION_DELETE,
    ];

    let repository: FakeEntityRepository<UserPermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let service: UserPermissionService;

    let owned: Permission;
    let foreign: Permission;
    let global: Permission;

    beforeEach(() => {
        repository = new FakeEntityRepository<UserPermission>({ defaults: { userRealmId: realmId } });
        permissionRepository = new FakeEntityRepository<Permission>();
        service = new UserPermissionService({
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
            data.user = { realmId };
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

    const bind = (permission: Permission) => repository.seed({
        userId: randomUUID(),
        permissionId: permission.id,
        permissionRealmId: permission.realmId,
    });

    it('should bind an owned permission only', async () => {
        const actor = await createActor();

        await expect(service.create({ userId: randomUUID(), permissionId: owned.id }, actor)).resolves.toBeDefined();
        await expect(service.create({ userId: randomUUID(), permissionId: foreign.id }, actor))
            .rejects.toThrow(PermissionError);
        await expect(service.create({ userId: randomUUID(), permissionId: global.id }, actor))
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
        await service.create({ userId: randomUUID(), permissionId: owned.id }, actor);
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

describe('core/entities/user-permission/service: a manager delegates owned permissions (#3907)', () => {
    const realmId = randomUUID();
    const clientId = randomUUID();
    const otherClientId = randomUUID();
    const policyId = randomUUID();

    const names = [
        PermissionName.USER_PERMISSION_CREATE,
        PermissionName.USER_PERMISSION_UPDATE,
        PermissionName.PERMISSION_UPDATE,
    ];

    let repository: FakeEntityRepository<UserPermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let service: UserPermissionService;

    let owned: Permission;
    let foreign: Permission;
    let global: Permission;

    beforeEach(() => {
        repository = new FakeEntityRepository<UserPermission>({ defaults: { userRealmId: realmId } });
        permissionRepository = new FakeEntityRepository<Permission>();
        service = new UserPermissionService({
            repository,
            permissionRepository,
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

        repository.onValidateJoinColumns((data: any) => {
            data.user = { realmId };
            data.permission = permissionRepository.getAll().find((permission) => permission.id === data.permissionId);
        });
    });

    const createActor = (held: string[] = names) => createClientMatchActor({
        clientId,
        realmId,
        names: held,
    });

    it('should bind an owned permission it does not hold, capped to the manager reach', async () => {
        const entity = await service.create({
            userId: randomUUID(),
            permissionId: owned.id,
            realmScope: RealmScope.ANY,
            policyId,
        }, await createActor());

        expect(entity.realmScope).toEqual(RealmScope.OWN);
        expect(entity.policyId).toEqual(policyId);
    });

    it('should not bind an owned permission without managing permissions', async () => {
        const actor = await createActor(names.filter((name) => name !== PermissionName.PERMISSION_UPDATE));

        await expect(service.create({ userId: randomUUID(), permissionId: owned.id }, actor))
            .rejects.toThrow(PermissionError);
    });

    it('should not bind a permission another client owns', async () => {
        await expect(service.create({ userId: randomUUID(), permissionId: foreign.id }, await createActor()))
            .rejects.toThrow(PermissionError);
    });

    it('should not bind a global permission it does not hold', async () => {
        await expect(service.create({ userId: randomUUID(), permissionId: global.id }, await createActor()))
            .rejects.toThrow(PermissionError);
    });

    it('should update a binding of an owned permission, capped to the manager reach', async () => {
        const binding = repository.seed({
            userId: randomUUID(),
            permissionId: owned.id,
            permissionRealmId: realmId,
            realmScope: RealmScope.ANY,
            policyId: null,
        });

        const entity = await service.update(binding.id, { policyId }, await createActor());

        expect(entity.realmScope).toEqual(RealmScope.OWN);
        expect(entity.policyId).toEqual(policyId);
    });

    it('should clear the policy of a binding of an owned permission', async () => {
        const binding = repository.seed({
            userId: randomUUID(),
            permissionId: owned.id,
            permissionRealmId: realmId,
            realmScope: RealmScope.OWN,
            policyId,
        });

        const entity = await service.update(binding.id, { policyId: null }, await createActor());

        expect(entity.policyId).toBeNull();
        expect(entity.realmScope).toEqual(RealmScope.OWN);
    });

    it('should not update a binding of a permission another client owns', async () => {
        const binding = repository.seed({
            userId: randomUUID(),
            permissionId: foreign.id,
            permissionRealmId: realmId,
        });

        await expect(service.update(binding.id, { policyId }, await createActor()))
            .rejects.toThrow(PermissionError);
    });
});
