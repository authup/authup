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
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { RealmScope } from '@authup/access';
import { UserPermissionService } from '../../../../../src/core/entities/user-permission/service.ts';
import {
    FakeEntityRepository,
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
} from '@authup/server-test-kit';
import { FakeIdentityPermissionProvider } from '../../helpers/index.ts';

describe('core/entities/user-permission/service', () => {
    let repository: FakeEntityRepository<UserPermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let identityPermissionProvider: FakeIdentityPermissionProvider;
    let service: UserPermissionService;

    beforeEach(() => {
        repository = new FakeEntityRepository<UserPermission>();
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
