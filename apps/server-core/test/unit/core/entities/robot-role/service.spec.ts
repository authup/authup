/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { RobotRole } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { RobotRoleService } from '../../../../../src/core/entities/robot-role/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/robot-role/service', () => {
    let repository: FakeEntityRepository<RobotRole>;
    let service: RobotRoleService;

    beforeEach(() => {
        repository = new FakeEntityRepository<RobotRole>();
        service = new RobotRoleService({ repository });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.ROBOT_ROLE_READ,
                    PermissionName.ROBOT_ROLE_UPDATE,
                    PermissionName.ROBOT_ROLE_DELETE,
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
            const robotRealmId = randomUUID();
            const roleRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.robot = { realm_id: robotRealmId };
                data.role = { realm_id: roleRealmId };
            });

            const data = {
                robot_id: randomUUID(),
                role_id: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.robot_realm_id).toBe(robotRealmId);
            expect(result.role_realm_id).toBe(roleRealmId);
        });

        it('should call preCheck with ROBOT_ROLE_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                robot_id: randomUUID(),
                role_id: randomUUID(), 
            }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROBOT_ROLE_CREATE });
        });

        it('should throw validation error when robot_id is missing', async () => {
            await expect(
                service.create({ role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/robot_id/);
        });

        it('should throw validation error when role_id is missing', async () => {
            await expect(
                service.create({ robot_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/role_id/);
        });

        it('should throw validation error when robot_id is not a valid UUID', async () => {
            await expect(
                service.create({ robot_id: 'not-a-uuid', role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/robot_id/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    robot_id: randomUUID(),
                    role_id: randomUUID(),
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

        it('should call preCheck with ROBOT_ROLE_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROBOT_ROLE_DELETE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });
});
