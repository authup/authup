/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { Permission, RobotPermission } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { RobotPermissionService } from '../../../../../src/core/entities/robot-permission/service.ts';
import { FakeEntityRepository, createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';
import { FakeIdentityPermissionProvider } from '../../helpers/index.ts';

describe('core/entities/robot-permission/service', () => {
    let repository: FakeEntityRepository<RobotPermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let service: RobotPermissionService;

    beforeEach(() => {
        repository = new FakeEntityRepository<RobotPermission>();
        permissionRepository = new FakeEntityRepository<Permission>();
        service = new RobotPermissionService({
            repository, 
            permissionRepository, 
            identityPermissionProvider: new FakeIdentityPermissionProvider(), 
        });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.ROBOT_PERMISSION_CREATE,
                    PermissionName.ROBOT_PERMISSION_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed({});
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('create', () => {
        it('should create entity and propagate realm ids', async () => {
            const robotRealmId = randomUUID();
            const permissionRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.robot = { realmId: robotRealmId };
                data.permission = { realmId: permissionRealmId, name: 'test-perm' };
            });

            const data = {
                robotId: randomUUID(),
                permissionId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.robotRealmId).toBe(robotRealmId);
            expect(result.permissionRealmId).toBe(permissionRealmId);
        });

        it('should preCheck permission name when permission is provided', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                robotId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should throw validation error when robotId is missing', async () => {
            await expect(
                service.create({ permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/robotId/);
        });

        it('should throw validation error when permissionId is missing', async () => {
            await expect(
                service.create({ robotId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permissionId/);
        });

        it('should throw validation error when robotId is not a valid UUID', async () => {
            await expect(
                service.create({ robotId: 'not-a-uuid', permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/robotId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    robotId: randomUUID(),
                    permissionId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const permissionId = randomUUID();
            const robotId = randomUUID();

            repository.seed({ permissionId, robotId });

            await expect(
                service.create({ permissionId, robotId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });
    });

    describe('update', () => {
        it('should update policyId on an existing entity', async () => {
            const entity = repository.seed({ policyId: null });
            const policyId = randomUUID();

            const result = await service.update(entity.id, { policyId }, createAllowAllActor());
            expect(result.policyId).toBe(policyId);
        });

        it('should clear policyId when set to null', async () => {
            const entity = repository.seed({ policyId: randomUUID() });

            const result = await service.update(entity.id, { policyId: null }, createAllowAllActor());
            expect(result.policyId).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { policyId: randomUUID() }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with ROBOT_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.update(entity.id, { policyId: null }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});
            await expect(
                service.update(entity.id, { policyId: randomUUID() }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should only update policyId and not other fields', async () => {
            const originalRobotId = randomUUID();
            const entity = repository.seed({ robotId: originalRobotId, policyId: null });
            const policyId = randomUUID();

            const result = await service.update(
                entity.id,
                { policyId, robotId: randomUUID() },
                createAllowAllActor(),
            );
            expect(result.policyId).toBe(policyId);
            expect(result.robotId).toBe(originalRobotId);
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with ROBOT_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_PERMISSION_DELETE });
        });
    });
});
