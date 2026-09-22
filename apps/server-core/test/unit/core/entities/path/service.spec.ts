/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Path } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import {
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import { PathService } from '../../../../../src/core/entities/path/service.ts';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { createFakePath } from '../../../../utils/domains/index.ts';
import { FakePathRepository } from './fake-repository.ts';

describe('core/entities/path/service', () => {
    let repository: FakePathRepository;
    let realmRepository: FakeRealmRepository;
    let service: PathService;
    let realmId: string;

    beforeEach(() => {
        repository = new FakePathRepository();
        realmRepository = new FakeRealmRepository();
        service = new PathService({
            repository,
            realmRepository,
        });
        realmId = randomUUID();
    });

    const seedPath = (data: Partial<Path>) : Path => repository.seed(createFakePath({
        parentId: null,
        realmId,
        ...data,
    }));

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            seedPath({
                name: 'sales',
                path: 'sales',
            });

            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with path permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);

            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.PATH_READ,
                    PermissionName.PATH_UPDATE,
                    PermissionName.PATH_DELETE,
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
            const entity = seedPath({
                name: 'sales',
                path: 'sales',
            });

            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should return entity by full path', async () => {
            const entity = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
            });

            const result = await service.getOne('sales/berlin', createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.getOne('nowhere', createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('create', () => {
        it('should create a root folder', async () => {
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'sales' }, actor);
            expect(result.name).toBe('sales');
            expect(result.path).toBe('sales');
            expect(result.parentId).toBeNull();
            expect(result.realmId).toBe(realmId);
        });

        it('should derive the path from the parent', async () => {
            const parent = seedPath({
                name: 'sales',
                path: 'sales',
            });

            const result = await service.create(
                {
                    name: 'berlin',
                    parentId: parent.id,
                },
                createNonMasterRealmActor(realmId),
            );

            expect(result.path).toBe('sales/berlin');
            expect(result.parentId).toBe(parent.id);
        });

        it('should call preCheck with PATH_CREATE permission', async () => {
            const actor = createNonMasterRealmActor(realmId);
            await service.create({ name: 'sales' }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.PATH_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'sales' }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should refuse a parent in another realm', async () => {
            const parent = seedPath({
                name: 'sales',
                path: 'sales',
                realmId: randomUUID(),
            });

            await expect(
                service.create(
                    {
                        name: 'berlin',
                        parentId: parent.id,
                    },
                    createNonMasterRealmActor(realmId),
                ),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should refuse a parent that does not exist', async () => {
            await expect(
                service.create(
                    {
                        name: 'berlin',
                        parentId: randomUUID(),
                    },
                    createNonMasterRealmActor(realmId),
                ),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should refuse a missing realm for a realm-less actor', async () => {
            await expect(
                service.create({ name: 'sales' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });
    });

    describe('update', () => {
        it('should rename a folder and rewrite its descendants', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });
            const berlin = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
                parentId: sales.id,
            });
            const east = seedPath({
                name: 'east',
                path: 'sales/berlin/east',
                parentId: berlin.id,
            });

            const result = await service.update(sales.id, { name: 'marketing' }, createAllowAllActor());
            expect(result.path).toBe('marketing');

            expect((await repository.findOneById(berlin.id))!.path).toBe('marketing/berlin');
            expect((await repository.findOneById(east.id))!.path).toBe('marketing/berlin/east');

            // the rows keep their identity, so every user and client filed
            // under them keeps resolving through its own `pathId`
            expect((await repository.findOneById(berlin.id))!.parentId).toBe(sales.id);
            expect((await repository.findOneById(east.id))!.parentId).toBe(berlin.id);

            expect(repository.transactionCalls).toBe(1);
        });

        it('should read the row, its parent and its descendants through the locked repository', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });
            const berlin = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
                parentId: sales.id,
            });
            seedPath({
                name: 'east',
                path: 'sales/berlin/east',
                parentId: berlin.id,
            });

            await service.update(berlin.id, { name: 'bremen' }, createAllowAllActor());

            // the instance the callback received is the locking one, and every
            // read the rewrite depends on ran on it: the row itself, the
            // resolved parent and the descendant set (issue I1). A rename of an
            // ANCESTOR is the race the transaction's own re-read cannot see.
            const locked = repository.transactionRepository;
            expect(locked).toBeDefined();
            expect(locked!.lockRows).toBe(true);
            expect(locked!.reads).toContain('findOneBy');
            expect(locked!.reads).toContain('findOneById');
            expect(locked!.reads).toContain('findDescendants');
            expect(repository.reads).not.toContain('findDescendants');
        });

        it('should leave the path and the descendants untouched when only the display name changes', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });
            const berlin = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
                parentId: sales.id,
            });

            const result = await service.update(sales.id, { displayName: 'Sales' }, createAllowAllActor());

            expect(result.displayName).toBe('Sales');
            expect(result.path).toBe('sales');
            expect(result.parentId).toBeNull();
            expect((await repository.findOneById(berlin.id))!.path).toBe('sales/berlin');
            expect(repository.transactionCalls).toBe(1);
        });

        it('should rewrite the descendants from the row as it reads inside the transaction', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });
            const berlin = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
                parentId: sales.id,
            });

            // a concurrent rename of the same folder commits between the read
            // and the transaction: the service holds a stale snapshot while
            // the store already reads `marketing`
            const stale : Path = { ...sales };
            sales.name = 'marketing';
            sales.path = 'marketing';
            berlin.path = 'marketing/berlin';

            vi.spyOn(repository, 'findOneByIdOrName').mockResolvedValueOnce(stale);

            const result = await service.update(sales.id, { name: 'sales-eu' }, createAllowAllActor());

            expect(result.path).toBe('sales-eu');
            expect((await repository.findOneById(sales.id))!.path).toBe('sales-eu');
            expect((await repository.findOneById(berlin.id))!.path).toBe('sales-eu/berlin');
        });

        it('should keep the parent when only the name changes', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });
            const berlin = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
                parentId: sales.id,
            });

            const result = await service.update(berlin.id, { name: 'bremen' }, createAllowAllActor());

            expect(result.parentId).toBe(sales.id);
            expect(result.path).toBe('sales/bremen');
        });

        it('should move a folder under another parent', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });
            const marketing = seedPath({
                name: 'marketing',
                path: 'marketing',
            });
            const berlin = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
                parentId: sales.id,
            });
            const east = seedPath({
                name: 'east',
                path: 'sales/berlin/east',
                parentId: berlin.id,
            });

            const result = await service.update(
                berlin.id,
                { parentId: marketing.id },
                createAllowAllActor(),
            );

            expect(result.path).toBe('marketing/berlin');
            expect(result.parentId).toBe(marketing.id);
            expect((await repository.findOneById(east.id))!.path).toBe('marketing/berlin/east');
        });

        it('should move a folder to the root', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });
            const berlin = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
                parentId: sales.id,
            });

            const result = await service.update(berlin.id, { parentId: null }, createAllowAllActor());

            expect(result.path).toBe('berlin');
            expect(result.parentId).toBeNull();
        });

        it('should refuse moving a folder under itself', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });

            await expect(
                service.update(sales.id, { parentId: sales.id }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should refuse moving a folder under its own descendant', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });
            const berlin = seedPath({
                name: 'berlin',
                path: 'sales/berlin',
                parentId: sales.id,
            });

            await expect(
                service.update(sales.id, { parentId: berlin.id }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should refuse a parent in another realm', async () => {
            const berlin = seedPath({
                name: 'berlin',
                path: 'berlin',
            });
            const foreign = seedPath({
                name: 'sales',
                path: 'sales',
                realmId: randomUUID(),
            });

            await expect(
                service.update(berlin.id, { parentId: foreign.id }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update(randomUUID(), { name: 'sales' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should throw when actor lacks permission', async () => {
            const sales = seedPath({
                name: 'sales',
                path: 'sales',
            });

            await expect(
                service.update(sales.id, { name: 'marketing' }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('delete', () => {
        it('should delete an existing folder', async () => {
            const entity = seedPath({
                name: 'sales',
                path: 'sales',
            });

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);

            expect(await repository.findOneById(entity.id)).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.delete(randomUUID(), createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = seedPath({
                name: 'sales',
                path: 'sales',
            });

            await expect(
                service.delete(entity.id, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });
});
