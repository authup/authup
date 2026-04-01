/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { UserPermission } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { UserPermissionService } from '../../../../../src/core/entities/user-permission/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/user-permission/service', () => {
    let repository: FakeEntityRepository<UserPermission>;
    let service: UserPermissionService;

    beforeEach(() => {
        repository = new FakeEntityRepository<UserPermission>();
        service = new UserPermissionService({
            repository 
        });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.USER_PERMISSION_CREATE,
                    PermissionName.USER_PERMISSION_DELETE,
                    PermissionName.USER_PERMISSION_READ,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed({});
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create entity and propagate realm ids', async () => {
            const data = {
                user_id: randomUUID(),
                permission_id: randomUUID(),
                user: {
                    realm_id: randomUUID() 
                },
                permission: {
                    realm_id: randomUUID(),
                    name: 'test-perm' 
                },
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.user_realm_id).toBe(data.user.realm_id);
            expect(result.permission_realm_id).toBe(data.permission.realm_id);
        });

        it('should preCheck permission name when permission is provided', async () => {
            const actor = createAllowAllActor();
            await service.create({
                user_id: randomUUID(),
                permission_id: randomUUID(),
                permission: {
                    name: 'custom-perm',
                    realm_id: null 
                },
            }, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    user_id: randomUUID(),
                    permission_id: randomUUID() 
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with USER_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: PermissionName.USER_PERMISSION_DELETE,
            });
        });
    });
});
