/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { RobotPermission } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it,
} from 'vitest';
import { NotFoundError } from '@ebec/http';
import { RobotPermissionService } from '../../../../../src/core/entities/robot-permission/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/robot-permission/service', () => {
    let repository: FakeEntityRepository<RobotPermission>;
    let service: RobotPermissionService;

    beforeEach(() => {
        repository = new FakeEntityRepository<RobotPermission>();
        service = new RobotPermissionService({ repository });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionChecker.preCheckOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.ROBOT_PERMISSION_CREATE,
                    PermissionName.ROBOT_PERMISSION_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow();
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const id = randomUUID();
            repository.seed([{ id } as RobotPermission]);
            const result = await service.getOne(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create entity and propagate realm ids', async () => {
            const data = {
                robot_id: randomUUID(),
                permission_id: randomUUID(),
                robot: { realm_id: randomUUID() },
                permission: { realm_id: randomUUID(), name: 'test-perm' },
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.robot_realm_id).toBe(data.robot.realm_id);
            expect(result.permission_realm_id).toBe(data.permission.realm_id);
        });

        it('should preCheck permission name when permission is provided', async () => {
            const actor = createAllowAllActor();
            await service.create({
                robot_id: randomUUID(),
                permission_id: randomUUID(),
                permission: { name: 'custom-perm', realm_id: null },
            }, actor);

            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: 'custom-perm',
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ robot_id: randomUUID(), permission_id: randomUUID() }, createDenyAllActor()),
            ).rejects.toThrow();
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const id = randomUUID();
            repository.seed([{ id } as RobotPermission]);
            const result = await service.delete(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with ROBOT_PERMISSION_DELETE', async () => {
            const id = randomUUID();
            repository.seed([{ id } as RobotPermission]);
            const actor = createAllowAllActor();
            await service.delete(id, actor);
            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.ROBOT_PERMISSION_DELETE,
            });
        });
    });
});
