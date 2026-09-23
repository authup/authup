/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { ErrorCode } from '@authup/errors';
import { ScopeService } from '../../../../../src/core/entities/scope/service.ts';
import { 
    createAllowAllActor, 
    createDenyAllActor, 
    createMasterRealmActor, 
    createNonMasterRealmActor, 
} from '@authup/server-test-kit';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { createFakeScope } from '../../../../utils/domains/index.ts';
import { FakeScopeRepository } from './fake-repository.ts';

describe('core/entities/scope/service', () => {
    let repository: FakeScopeRepository;
    let realmRepository: FakeRealmRepository;
    let service: ScopeService;

    beforeEach(() => {
        repository = new FakeScopeRepository();
        realmRepository = new FakeRealmRepository();
        service = new ScopeService({
            repository,
            realmRepository, 
        });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([
                createFakeScope(),
            ]);

            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with scope permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);

            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.SCOPE_READ,
                    PermissionName.SCOPE_UPDATE,
                    PermissionName.SCOPE_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.getMany({}, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakeScope({ name: 'test-scope' }));

            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.name).toBe('test-scope');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.getOne('non-existent-id', createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('create', () => {
        it('should create a scope with valid data', async () => {
            const result = await service.create(
                { name: 'new-scope' },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-scope');
        });

        it('should call preCheck with SCOPE_CREATE permission', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'new-scope' }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.SCOPE_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'new-scope' }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should reject invalid name (too short)', async () => {
            await expect(
                service.create({ name: 'ab' }, createAllowAllActor()),
            ).rejects.toThrow(/name/i);
        });
    });

    describe('update', () => {
        it('should update an existing scope', async () => {
            const entity = repository.seed(createFakeScope({ name: 'old-name' }));

            const result = await service.update(entity.id, { name: 'new-name' }, createAllowAllActor());
            expect(result.name).toBe('new-name');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { name: 'x' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('update with a restricted grant (#3654)', () => {
        const restrictedActor = () => {
            const actor = createAllowAllActor();
            actor.permissionEvaluator.setBehavior(({ method, ctx }) => {
                if (method !== 'evaluate') {
                    return;
                }

                const attributes = ctx.data?.get<Record<string, any>>(BuiltInPolicyType.ATTRIBUTES);
                if (!attributes?.name?.startsWith('reach-')) {
                    throw PermissionError.denied('out of reach');
                }
            });
            return actor;
        };

        it('should refuse moving an unreachable scope into reach', async () => {
            const entity = repository.seed(createFakeScope({ name: 'other-name' }));

            await expect(
                service.update(entity.id, { name: 'reach-name' }, restrictedActor()),
            ).rejects.toBeInstanceOf(PermissionError);
            expect(repository.getAll().find((e) => e.id === entity.id)?.name).toBe('other-name');
        });

        it('should allow updating a reachable scope that stays reachable', async () => {
            const entity = repository.seed(createFakeScope({ name: 'reach-name' }));

            const result = await service.update(entity.id, { name: 'reach-renamed' }, restrictedActor());
            expect(result.name).toBe('reach-renamed');
        });

        it('should refuse moving a reachable scope out of reach', async () => {
            const entity = repository.seed(createFakeScope({ name: 'reach-name' }));

            await expect(
                service.update(entity.id, { name: 'other-name' }, restrictedActor()),
            ).rejects.toBeInstanceOf(PermissionError);
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const {
                entity, 
                created, 
            } = await service.save(
                undefined,
                { name: 'upserted-scope' },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-scope');
        });

        it('should update when entity found', async () => {
            const entity = repository.seed(createFakeScope({ name: 'old-name' }));

            const { created } = await service.save(
                entity.id,
                { name: 'updated-name' },
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

    describe('realm defaulting', () => {
        it('should set realmId for non-master realm actor on create', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'realm-scope' }, actor);
            expect(result.realmId).toBe(realmId);
        });

        it('should set realmId to master realm for master realm actor on create', async () => {
            const actor = createMasterRealmActor();
            const masterRealmId = actor.identity!.data.realmId;

            const result = await service.create({ name: 'global-scope' }, actor);
            expect(result.realmId).toBe(masterRealmId);
        });

        it('should preserve realmId: null when explicitly provided on create', async () => {
            const actor = createNonMasterRealmActor();

            const result = await service.create(
                {
                    name: 'global-scope',
                    realmId: null, 
                },
                actor,
            );

            expect(result.realmId).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete an existing scope', async () => {
            const entity = repository.seed(createFakeScope());

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);

            const found = await repository.findOneById(entity.id);
            expect(found).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.delete('non-existent-id', createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed(createFakeScope());

            await expect(
                service.delete(entity.id, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });
});
