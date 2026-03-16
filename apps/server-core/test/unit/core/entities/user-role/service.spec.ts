/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { UserRole } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { UserRoleService } from '../../../../../src/core/entities/user-role/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/user-role/service', () => {
    let repository: FakeEntityRepository<UserRole>;
    let service: UserRoleService;

    beforeEach(() => {
        repository = new FakeEntityRepository<UserRole>();
        service = new UserRoleService({ repository });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionChecker.preCheckOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.USER_ROLE_READ,
                    PermissionName.USER_ROLE_CREATE,
                    PermissionName.USER_ROLE_UPDATE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed({} as UserRole);
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
                role_id: randomUUID(),
                user: { realm_id: randomUUID() },
                role: { realm_id: randomUUID() },
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.user_realm_id).toBe(data.user.realm_id);
            expect(result.role_realm_id).toBe(data.role.realm_id);
        });

        it('should call preCheck with USER_ROLE_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({ user_id: randomUUID(), role_id: randomUUID() }, actor);
            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.USER_ROLE_CREATE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ user_id: randomUUID(), role_id: randomUUID() }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({} as UserRole);
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should call preCheck with USER_ROLE_DELETE', async () => {
            const entity = repository.seed({} as UserRole);
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.USER_ROLE_DELETE,
            });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });
});
