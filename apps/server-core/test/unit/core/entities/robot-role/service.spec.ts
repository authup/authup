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
import { ErrorCode } from '@authup/errors';
import { RobotRoleService } from '../../../../../src/core/entities/robot-role/service.ts';
import { 
    FakeEntityRepository, 
    createAllowAllActor, 
    createDenyAllActor, 
    createMasterRealmActor, 
} from '@authup/server-test-kit';
import { FakeIdentityPermissionProvider } from '../../helpers/fake-identity-permission-provider.ts';

describe('core/entities/robot-role/service', () => {
    let repository: FakeEntityRepository<RobotRole>;
    let service: RobotRoleService;

    let identityPermissionProvider: FakeIdentityPermissionProvider;

    beforeEach(() => {
        repository = new FakeEntityRepository<RobotRole>();
        identityPermissionProvider = new FakeIdentityPermissionProvider();
        service = new RobotRoleService({ repository, identityPermissionProvider });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.ROBOT_ROLE_READ,
                    PermissionName.ROBOT_ROLE_UPDATE,
                    PermissionName.ROBOT_ROLE_DELETE,
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
            const roleRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.robot = { realmId: robotRealmId };
                data.role = { realmId: roleRealmId };
            });

            const data = {
                robotId: randomUUID(),
                roleId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.robotRealmId).toBe(robotRealmId);
            expect(result.roleRealmId).toBe(roleRealmId);
        });

        it('should call preCheck with ROBOT_ROLE_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                robotId: randomUUID(),
                roleId: randomUUID(), 
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_ROLE_CREATE });
        });

        it('should throw validation error when robotId is missing', async () => {
            await expect(
                service.create({ roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/robotId/);
        });

        it('should throw validation error when roleId is missing', async () => {
            await expect(
                service.create({ robotId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/roleId/);
        });

        it('should throw validation error when robotId is not a valid UUID', async () => {
            await expect(
                service.create({ robotId: 'not-a-uuid', roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/robotId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    robotId: randomUUID(),
                    roleId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ForbiddenError when actor does not own role permissions (superset check)', async () => {
            const identityPermissionProviderDeny = new FakeIdentityPermissionProvider();
            identityPermissionProviderDeny.setSuperset(false);
            const svc = new RobotRoleService({ repository, identityPermissionProvider: identityPermissionProviderDeny });

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: null, clientId: null };
                data.robot = { realmId: null };
            });

            await expect(
                svc.create({
                    robotId: randomUUID(),
                    roleId: randomUUID(),
                }, createMasterRealmActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const roleId = randomUUID();
            const robotId = randomUUID();

            repository.seed({ roleId, robotId });

            await expect(
                service.create({ roleId, robotId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
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
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_ROLE_DELETE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });
});
