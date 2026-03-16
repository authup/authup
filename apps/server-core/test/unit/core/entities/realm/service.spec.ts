/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    PermissionName,
    REALM_MASTER_NAME,
} from '@authup/core-kit';
import type { Realm } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it,
} from 'vitest';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { RealmService } from '../../../../../src/core/entities/realm/service.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/realm/service', () => {
    let repository: FakeRealmRepository;
    let service: RealmService;

    beforeEach(() => {
        repository = new FakeRealmRepository();
        service = new RealmService({ repository });
    });

    describe('getMany', () => {
        it('should return entities without actor context', async () => {
            const result = await service.getMany({});
            expect(result.data.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getOne', () => {
        it('should return the master realm by name', async () => {
            const result = await service.getOne(REALM_MASTER_NAME);
            expect(result.name).toBe(REALM_MASTER_NAME);
        });

        it('should return realm by id', async () => {
            const masterRealm = repository.getMasterRealm();
            const result = await service.getOne(masterRealm.id);
            expect(result.name).toBe(REALM_MASTER_NAME);
        });

        it('should throw NotFoundError when realm does not exist', async () => {
            await expect(
                service.getOne(randomUUID()),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create a realm with valid data', async () => {
            const result = await service.create(
                { name: 'new-realm' },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-realm');
        });

        it('should call preCheck with REALM_CREATE permission', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'test-realm' }, actor);

            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.REALM_CREATE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'new-realm' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should reject invalid name (too short)', async () => {
            await expect(
                service.create({ name: 'ab' }, createAllowAllActor()),
            ).rejects.toThrow(/name/i);
        });

        it('should persist the entity', async () => {
            const result = await service.create(
                { name: 'persisted-realm' },
                createAllowAllActor(),
            );

            const found = await repository.findOneById(result.id);
            expect(found).not.toBeNull();
        });
    });

    describe('update', () => {
        it('should update an existing realm', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'old-realm', built_in: false,
            } as Realm]);

            const result = await service.update(id, { name: 'new-realm' }, createAllowAllActor());
            expect(result.name).toBe('new-realm');
        });

        it('should throw NotFoundError when realm does not exist', async () => {
            await expect(
                service.update(randomUUID(), { name: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should prevent renaming the master realm', async () => {
            const masterRealm = repository.getMasterRealm();

            await expect(
                service.update(masterRealm.id, { name: 'renamed-master' }, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should allow updating master realm fields other than name', async () => {
            const masterRealm = repository.getMasterRealm();

            const result = await service.update(
                masterRealm.id,
                { description: 'updated description' },
                createAllowAllActor(),
            );

            expect(result.description).toBe('updated description');
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const { entity, created } = await service.save(
                undefined,
                { name: 'upserted-realm' },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-realm');
        });

        it('should update when entity found', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'old-realm', built_in: false,
            } as Realm]);

            const { created } = await service.save(
                id,
                { name: 'updated-realm' },
                createAllowAllActor(),
            );

            expect(created).toBe(false);
        });

        it('should throw NotFoundError with updateOnly when entity missing', async () => {
            await expect(
                service.save(randomUUID(), { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('delete', () => {
        it('should delete a non-built-in realm', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'deletable', built_in: false,
            } as Realm]);

            const result = await service.delete(id, createAllowAllActor());
            expect(result.id).toBe(id);

            const found = await repository.findOneById(id);
            expect(found).toBeNull();
        });

        it('should throw NotFoundError when realm does not exist', async () => {
            await expect(
                service.delete(randomUUID(), createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should prevent deletion of built-in realms', async () => {
            const masterRealm = repository.getMasterRealm();

            await expect(
                service.delete(masterRealm.id, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should call preCheck with REALM_DELETE permission', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'test', built_in: false,
            } as Realm]);

            const actor = createAllowAllActor();
            await service.delete(id, actor);

            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.REALM_DELETE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'test', built_in: false,
            } as Realm]);

            await expect(
                service.delete(id, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });
});
