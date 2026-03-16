/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { RoleAttribute } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { RoleAttributeService } from '../../../../../src/core/entities/role-attribute/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/role-attribute/service', () => {
    let repository: FakeEntityRepository<RoleAttribute>;
    let service: RoleAttributeService;

    beforeEach(() => {
        repository = new FakeEntityRepository<RoleAttribute>();
        service = new RoleAttributeService({ repository });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([
                { id: randomUUID(), name: 'attr-a', role_id: randomUUID() } as RoleAttribute,
            ]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should filter out entities that fail per-record permission check', async () => {
            repository.seed([
                { id: randomUUID(), name: 'allowed', role_id: 'role-1' } as RoleAttribute,
                { id: randomUUID(), name: 'denied', role_id: 'role-2' } as RoleAttribute,
            ]);

            const actor = createAllowAllActor();
            let callCount = 0;
            vi.mocked(actor.permissionChecker.checkOneOf).mockImplementation(async () => {
                callCount++;
                if (callCount === 2) {
                    throw new ForbiddenError();
                }
            });

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('allowed');
            expect(result.meta.total).toBe(1);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow();
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'attr' } as RoleAttribute]);
            const result = await service.getOne(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create entity and set realm_id from role', async () => {
            const roleRealmId = randomUUID();
            const data = {
                name: 'new-attr',
                value: 'val',
                role_id: randomUUID(),
                role: { realm_id: roleRealmId },
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.realm_id).toBe(roleRealmId);
        });

        it('should use ROLE_UPDATE permission (not a separate attribute permission)', async () => {
            const actor = createAllowAllActor();
            await service.create({
                name: 'attr', value: 'val', role_id: randomUUID(), role: { realm_id: null },
            }, actor);

            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.ROLE_UPDATE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'attr', role_id: randomUUID(), role: { realm_id: null } }, createDenyAllActor()),
            ).rejects.toThrow();
        });
    });

    describe('update', () => {
        it('should update an existing attribute', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'old', value: 'old-val' } as RoleAttribute]);

            const result = await service.update(id, { value: 'new-val' }, createAllowAllActor());
            expect(result.value).toBe('new-val');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update(randomUUID(), { value: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('delete', () => {
        it('should delete an existing attribute', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'del' } as RoleAttribute]);

            const result = await service.delete(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should use ROLE_UPDATE permission for deletion', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'del' } as RoleAttribute]);

            const actor = createAllowAllActor();
            await service.delete(id, actor);
            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.ROLE_UPDATE,
            });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });
});
