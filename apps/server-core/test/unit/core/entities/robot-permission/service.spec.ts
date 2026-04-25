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
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ConflictError, ForbiddenError, NotFoundError } from '@ebec/http';
import { RobotPermissionService } from '../../../../../src/core/entities/robot-permission/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/fake-actor.ts';

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
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.ROBOT_PERMISSION_CREATE,
                    PermissionName.ROBOT_PERMISSION_DELETE,
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
            const permissionRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.robot = { realm_id: robotRealmId };
                data.permission = { realm_id: permissionRealmId, name: 'test-perm' };
            });

            const data = {
                robot_id: randomUUID(),
                permission_id: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.robot_realm_id).toBe(robotRealmId);
            expect(result.permission_realm_id).toBe(permissionRealmId);
        });

        it('should preCheck permission name when permission is provided', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realm_id: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                robot_id: randomUUID(),
                permission_id: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should throw validation error when robot_id is missing', async () => {
            await expect(
                service.create({ permission_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/robot_id/);
        });

        it('should throw validation error when permission_id is missing', async () => {
            await expect(
                service.create({ robot_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permission_id/);
        });

        it('should throw validation error when robot_id is not a valid UUID', async () => {
            await expect(
                service.create({ robot_id: 'not-a-uuid', permission_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/robot_id/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    robot_id: randomUUID(),
                    permission_id: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const permissionId = randomUUID();
            const robotId = randomUUID();

            repository.seed({ permission_id: permissionId, robot_id: robotId });

            await expect(
                service.create({ permission_id: permissionId, robot_id: robotId }, createAllowAllActor()),
            ).rejects.toThrow(ConflictError);
        });
    });

    describe('update', () => {
        it('should update policy_id on an existing entity', async () => {
            const entity = repository.seed({ policy_id: null });
            const policyId = randomUUID();

            const result = await service.update(entity.id, { policy_id: policyId }, createAllowAllActor());
            expect(result.policy_id).toBe(policyId);
        });

        it('should clear policy_id when set to null', async () => {
            const entity = repository.seed({ policy_id: randomUUID() });

            const result = await service.update(entity.id, { policy_id: null }, createAllowAllActor());
            expect(result.policy_id).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { policy_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with ROBOT_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.update(entity.id, { policy_id: null }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROBOT_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});
            await expect(
                service.update(entity.id, { policy_id: randomUUID() }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should only update policy_id and not other fields', async () => {
            const originalRobotId = randomUUID();
            const entity = repository.seed({ robot_id: originalRobotId, policy_id: null });
            const policyId = randomUUID();

            const result = await service.update(
                entity.id,
                { policy_id: policyId, robot_id: randomUUID() },
                createAllowAllActor(),
            );
            expect(result.policy_id).toBe(policyId);
            expect(result.robot_id).toBe(originalRobotId);
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

        it('should call preCheck with ROBOT_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROBOT_PERMISSION_DELETE });
        });
    });
});
