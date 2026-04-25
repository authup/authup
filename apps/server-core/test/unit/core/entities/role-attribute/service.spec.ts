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
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { RoleAttributeService } from '../../../../../src/core/entities/role-attribute/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/fake-actor.ts';
import { createFakeRoleAttribute } from '../../../../utils/domains/index.ts';

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
                createFakeRoleAttribute({ role_id: randomUUID() }),
            ]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should filter out entities that fail per-record permission check', async () => {
            const [, denied] = repository.seed([
                createFakeRoleAttribute({
                    name: 'allowed',
                    role_id: 'role-1', 
                }),
                createFakeRoleAttribute({
                    name: 'denied',
                    role_id: 'role-2', 
                }),
            ]);

            const actor = createAllowAllActor();
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluateOneOf' && call.ctx.input) {
                    const entity = call.ctx.input.get('attributes');
                    if (entity && entity.id === denied.id) {
                        throw new ForbiddenError();
                    }
                }
            });

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('allowed');
            expect(result.meta.total).toBe(1);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakeRoleAttribute());
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
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
                name: 'attr',
                value: 'val',
                role_id: randomUUID(),
                role: { realm_id: null },
            }, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROLE_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    name: 'attr',
                    role_id: randomUUID(),
                    role: { realm_id: null }, 
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('update', () => {
        it('should update an existing attribute', async () => {
            const entity = repository.seed(createFakeRoleAttribute({
                name: 'old',
                value: 'old-val', 
            }));

            const result = await service.update(entity.id, { value: 'new-val' }, createAllowAllActor());
            expect(result.value).toBe('new-val');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { value: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('delete', () => {
        it('should delete an existing attribute', async () => {
            const entity = repository.seed(createFakeRoleAttribute());

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should use ROLE_UPDATE permission for deletion', async () => {
            const entity = repository.seed(createFakeRoleAttribute());

            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROLE_UPDATE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });
});
