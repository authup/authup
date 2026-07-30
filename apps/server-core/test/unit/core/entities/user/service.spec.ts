/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    IdentityType,
    PermissionName,
} from '@authup/core-kit';
import type { Realm, User } from '@authup/core-kit';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { eq } from '@rapiq/core';
import { applyQuery } from '@rapiq/adapter-memory';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { UserService } from '../../../../../src/core/entities/user/service.ts';
import {
    FakePermissionEvaluator,
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import type { FakeActorContext } from '@authup/server-test-kit';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { FakeUserRepository } from './fake-repository.ts';
import { createFakeUser } from '../../../../utils/domains/index.ts';

function createSelfActor(userId: string, userName?: string, realmId?: string): FakeActorContext {
    const rId = realmId || randomUUID();
    return {
        permissionEvaluator: new FakePermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                id: userId,
                name: userName || 'self-user',
                realmId: rId,
                realm: {
                    id: rId,
                    name: 'test-realm',
                } as Realm,
            } as User,
        },
    };
}

describe('core/entities/user/service', () => {
    let repository: FakeUserRepository;
    let realmRepository: FakeRealmRepository;
    let service: UserService;

    beforeEach(() => {
        repository = new FakeUserRepository();
        realmRepository = new FakeRealmRepository();
        service = new UserService({
            repository,
            realmRepository, 
        });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([createFakeUser()]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with read/update/delete permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should always include self in results without per-record check', async () => {
            const [selfUser] = repository.seed([
                createFakeUser({ name: 'self' }),
                createFakeUser({ name: 'other' }),
            ]);

            const actor = createSelfActor(selfUser.id);
            actor.permissionEvaluator.deny('evaluateOneOf');

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe(selfUser.id);
        });

        it('should filter out other users on per-record permission failure', async () => {
            repository.seed([createFakeUser({ name: 'other' })]);

            const actor = createSelfActor(randomUUID());
            actor.permissionEvaluator.deny('evaluateOneOf');

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });

        it('composes the self short-circuit with a compiled conditional as WHERE and skips per-row evaluation', async () => {
            const realmId = randomUUID();
            // the self row lives OUTSIDE the compiled realm condition — only the
            // ownership OR-term can include it
            const [selfUser, foreignSameRealm, foreignOtherRealm] = repository.seed([
                createFakeUser({ name: 'self', realmId: randomUUID() }),
                createFakeUser({ name: 'same-realm', realmId }),
                createFakeUser({ name: 'other-realm', realmId: randomUUID() }),
            ]);

            const actor = createSelfActor(selfUser.id);
            actor.permissionEvaluator.setCompileResult({
                verdict: 'conditional',
                condition: eq('realmId', realmId),
            });

            const spy = vi.spyOn(repository, 'findMany');
            await service.getMany({}, actor);

            // the fake repository does not apply filters — replay the query the
            // service built over the seeded rows instead
            const query = spy.mock.calls[0]![0];
            const applied = applyQuery(query, [selfUser, foreignSameRealm, foreignOtherRealm]);
            expect(applied.data.map((row) => row.id).sort())
                .toEqual([selfUser.id, foreignSameRealm.id].sort());

            expect(actor.permissionEvaluator.evaluateOneOfCalls).toHaveLength(0);
        });

        it('restricts to the own row on a compiled deny', async () => {
            const [selfUser, foreign] = repository.seed([
                createFakeUser({ name: 'self' }),
                createFakeUser({ name: 'other' }),
            ]);

            const actor = createSelfActor(selfUser.id);
            actor.permissionEvaluator.setCompileResult({ verdict: 'deny' });

            const spy = vi.spyOn(repository, 'findMany');
            await service.getMany({}, actor);

            const query = spy.mock.calls[0]![0];
            const applied = applyQuery(query, [selfUser, foreign]);
            expect(applied.data.map((row) => row.id)).toEqual([selfUser.id]);
            expect(actor.permissionEvaluator.evaluateOneOfCalls).toHaveLength(0);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakeUser({ name: 'test-user' }));
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.name).toBe('test-user');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.getOne('non-existent-id', createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should allow self-access by id without permission check', async () => {
            const entity = repository.seed(createFakeUser({ name: 'self-user' }));

            const actor = createSelfActor(entity.id);
            actor.permissionEvaluator.deny('preEvaluateOneOf');

            const result = await service.getOne(entity.id, actor);
            expect(result.id).toBe(entity.id);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toHaveLength(0);
        });

        it('should allow self-access by name without permission check', async () => {
            const userName = 'self-user';
            const entity = repository.seed(createFakeUser({ name: userName }));

            const actor = createSelfActor(entity.id, userName);
            actor.permissionEvaluator.deny('preEvaluateOneOf');

            const result = await service.getOne(userName, actor);
            expect(result.id).toBe(entity.id);
        });

        it('should require permission for non-self access', async () => {
            const entity = repository.seed(createFakeUser({ name: 'other-user' }));

            await expect(
                service.getOne(entity.id, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should require permission when self-by-name resolves to a different user', async () => {
            const otherEntity = repository.seed(createFakeUser({ name: 'shared-name' }));
            const actor = createSelfActor(randomUUID(), 'shared-name');
            actor.permissionEvaluator.deny('preEvaluateOneOf');

            await expect(service.getOne('shared-name', actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
            expect(otherEntity.name).toBe('shared-name');
        });
    });

    describe('create', () => {
        it('should create a user with valid data', async () => {
            const result = await service.create(
                {
                    name: 'new-user',
                    email: 'new@example.com',
                    password: 'securepass123', 
                },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-user');
        });

        it('should hash password on create', async () => {
            const result = await service.create(
                {
                    name: 'hashed-user',
                    email: 'hashed@example.com',
                    password: 'plaintext123', 
                },
                createAllowAllActor(),
            );

            expect(result.password).not.toBe('plaintext123');
            expect(result.password).toMatch(/^\$2[aby]\$/);
        });

        it('should call preCheck with USER_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                name: 'test-user',
                email: 'test@example.com', 
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    name: 'test-user',
                    email: 'test@example.com', 
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should set realmId from actor for non-master realm', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({
                name: 'realm-user',
                email: 'realm@example.com',
            }, actor);
            expect(result.realmId).toBe(realmId);
        });

        it('should reject a password below the default minimum length', async () => {
            await expect(
                service.create({
                    name: 'short-pass-user',
                    email: 'short-pass@example.com',
                    password: 'a'.repeat(9),
                }, createAllowAllActor()),
            ).rejects.toThrow(/password/i);
        });

        it('should accept a password at the default minimum length', async () => {
            const result = await service.create({
                name: 'floor-pass-user',
                email: 'floor-pass@example.com',
                password: 'a'.repeat(10),
            }, createAllowAllActor());

            expect(result.id).toBeDefined();
        });

        it('should honor a configured minimum password length', async () => {
            const strictService = new UserService({
                repository,
                realmRepository,
                passwordMinLength: 12,
            });

            await expect(
                strictService.create({
                    name: 'strict-pass-user',
                    email: 'strict-pass@example.com',
                    password: 'a'.repeat(11),
                }, createAllowAllActor()),
            ).rejects.toThrow(/password/i);

            const result = await strictService.create({
                name: 'strict-pass-user',
                email: 'strict-pass@example.com',
                password: 'a'.repeat(12),
            }, createAllowAllActor());
            expect(result.id).toBeDefined();
        });
    });

    describe('update', () => {
        it('should update an existing user', async () => {
            const entity = repository.seed(createFakeUser({ name: 'old-name' }));

            const result = await service.update(entity.id, { displayName: 'New Display' }, createAllowAllActor());
            expect(result.displayName).toBe('New Display');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { displayName: 'x' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should hash password on update', async () => {
            const entity = repository.seed(createFakeUser());

            const result = await service.update(entity.id, { password: 'new-pass-123' }, createAllowAllActor());
            expect(result.password).toMatch(/^\$2[aby]\$/);
        });

        // The realm is immutable after creation. The junction rows and every
        // per-user child table denormalize it, so a move would strand them.
        it('should ignore a submitted realmId that matches the own realm', async () => {
            const realm = realmRepository.getMasterRealm();
            const entity = repository.seed(createFakeUser({ realmId: realm.id }));

            const result = await service.update(
                entity.id,
                {
                    displayName: 'New Display',
                    realmId: realm.id,
                },
                createAllowAllActor(),
            );

            expect(result.displayName).toBe('New Display');
            expect(result.realmId).toBe(realm.id);
        });

        it('should not move the user to another realm', async () => {
            const realm = realmRepository.getMasterRealm();
            const [target] = realmRepository.seed([{
                id: randomUUID(),
                name: 'target',
            }]);
            const entity = repository.seed(createFakeUser({ realmId: realm.id }));

            await expect(
                service.update(entity.id, { realmId: target.id }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });

            expect((await repository.findOneById(entity.id))!.realmId).toBe(realm.id);
        });
    });

    describe('self-edit fallback', () => {
        const denyOnlyUserUpdate = (actor: FakeActorContext) => {
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.USER_UPDATE) {
                    throw PermissionError.denied('test');
                }
            });
        };

        it('should allow self-edit without USER_UPDATE permission', async () => {
            const entity = repository.seed(createFakeUser({ name: 'self-user' }));

            const actor = createSelfActor(entity.id);
            denyOnlyUserUpdate(actor);

            const result = await service.update(entity.id, { displayName: 'Updated' }, actor);
            expect(result.displayName).toBe('Updated');

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_SELF_MANAGE });
            expect(actor.permissionEvaluator.evaluateCalls).toContainEqual(
                expect.objectContaining({ name: PermissionName.USER_SELF_MANAGE }),
            );
        });

        it('should evaluate USER_SELF_MANAGE against the validated input data only', async () => {
            const entity = repository.seed(createFakeUser({ name: 'self-user' }));

            const actor = createSelfActor(entity.id);
            denyOnlyUserUpdate(actor);

            await service.update(entity.id, { displayName: 'Updated' }, actor);

            const selfManageCall = actor.permissionEvaluator.evaluateCalls.find(
                (c) => c.name === PermissionName.USER_SELF_MANAGE,
            );
            expect(selfManageCall).toBeDefined();
            const attrs = selfManageCall!.data!.get<Record<string, any>>(BuiltInPolicyType.ATTRIBUTES);
            expect(attrs).toHaveProperty('displayName', 'Updated');
            expect(attrs).not.toHaveProperty('id');
            expect(attrs).not.toHaveProperty('active');
            expect(attrs).not.toHaveProperty('realmId');
        });

        it('should throw when non-self user lacks USER_UPDATE', async () => {
            const entity = repository.seed(createFakeUser({ name: 'other-user' }));

            const actor = createSelfActor(randomUUID());
            denyOnlyUserUpdate(actor);

            await expect(
                service.update(entity.id, { displayName: 'forbidden' }, actor),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw when actor lacks both USER_UPDATE and USER_SELF_MANAGE', async () => {
            const entity = repository.seed(createFakeUser({ name: 'self-user' }));

            const actor = createSelfActor(entity.id);
            actor.permissionEvaluator.denyAll();

            await expect(
                service.update(entity.id, { displayName: 'forbidden' }, actor),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('name-lock protection', () => {
        it('should prevent name change when nameLocked is true and not unlocked', async () => {
            const entity = repository.seed(createFakeUser({
                name: 'locked-name',
                nameLocked: true, 
            }));

            const result = await service.update(
                entity.id,
                { name: 'new-name' },
                createAllowAllActor(),
            );

            expect(result.name).toBe('locked-name');
        });

        it('should allow name change when nameLocked is explicitly set to false', async () => {
            const entity = repository.seed(createFakeUser({
                name: 'locked-name',
                nameLocked: true, 
            }));

            const result = await service.update(
                entity.id,
                {
                    name: 'new-name',
                    nameLocked: false, 
                },
                createAllowAllActor(),
            );

            expect(result.name).toBe('new-name');
            expect(result.nameLocked).toBe(false);
        });

        it('should prevent name change when re-locking with nameLocked: true', async () => {
            const entity = repository.seed(createFakeUser({
                name: 'locked-name',
                nameLocked: true, 
            }));

            const result = await service.update(
                entity.id,
                {
                    name: 'new-name',
                    nameLocked: true, 
                },
                createAllowAllActor(),
            );

            expect(result.name).toBe('locked-name');
        });

        it('should allow name change when name was not locked', async () => {
            const entity = repository.seed(createFakeUser({
                name: 'old-name',
                nameLocked: false, 
            }));

            const result = await service.update(
                entity.id,
                { name: 'new-name' },
                createAllowAllActor(),
            );

            expect(result.name).toBe('new-name');
        });
    });

    describe('delete', () => {
        it('should delete an existing user', async () => {
            const entity = repository.seed(createFakeUser());
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.delete('non-existent-id', createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should prevent self-deletion', async () => {
            const entity = repository.seed(createFakeUser({ name: 'self-user' }));

            const actor = createSelfActor(entity.id);

            await expect(
                service.delete(entity.id, actor),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should call preCheck with USER_DELETE', async () => {
            const entity = repository.seed(createFakeUser());
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_DELETE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed(createFakeUser());
            await expect(service.delete(entity.id, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const {
                entity, 
                created, 
            } = await service.save(
                undefined,
                {
                    name: 'upserted-user',
                    email: 'upsert@example.com', 
                },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-user');
        });

        it('should update when entity found', async () => {
            const entity = repository.seed(createFakeUser());

            const { created } = await service.save(
                entity.id,
                { displayName: 'updated' },
                createAllowAllActor(),
            );

            expect(created).toBe(false);
        });

        it('should throw NotFoundError with updateOnly when entity missing', async () => {
            await expect(
                service.save('non-existent-id', { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });
});
