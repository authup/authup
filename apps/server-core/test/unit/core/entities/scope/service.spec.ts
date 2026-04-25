/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { Scope } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { ScopeService } from '../../../../../src/core/entities/scope/service.ts';
import type { IScopeRepository } from '../../../../../src/core/entities/scope/types.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
    createNonMasterRealmActor,
} from '../../helpers/fake-actor.ts';
import { createFakeScope } from '../../../../utils/domains/index.ts';

class FakeScopeRepository extends FakeEntityRepository<Scope> implements IScopeRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }
}

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

            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
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
            ).rejects.toThrow(ForbiddenError);
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
            ).rejects.toThrow(NotFoundError);
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

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.SCOPE_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'new-scope' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
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
            ).rejects.toThrow(NotFoundError);
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
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('realm defaulting', () => {
        it('should set realm_id for non-master realm actor on create', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'realm-scope' }, actor);
            expect(result.realm_id).toBe(realmId);
        });

        it('should set realm_id to master realm for master realm actor on create', async () => {
            const actor = createMasterRealmActor();
            const masterRealmId = actor.identity!.data.realm_id;

            const result = await service.create({ name: 'global-scope' }, actor);
            expect(result.realm_id).toBe(masterRealmId);
        });

        it('should preserve realm_id: null when explicitly provided on create', async () => {
            const actor = createNonMasterRealmActor();

            const result = await service.create(
                {
                    name: 'global-scope',
                    realm_id: null, 
                },
                actor,
            );

            expect(result.realm_id).toBeNull();
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
            ).rejects.toThrow(NotFoundError);
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed(createFakeScope());

            await expect(
                service.delete(entity.id, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });
});
