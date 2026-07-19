/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { PermissionPolicy } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { PermissionPolicyService } from '../../../../../src/core/entities/permission-policy/service.ts';
import { FakeEntityRepository, createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';

describe('core/entities/permission-policy/service', () => {
    let repository: FakeEntityRepository<PermissionPolicy>;
    let service: PermissionPolicyService;

    beforeEach(() => {
        repository = new FakeEntityRepository<PermissionPolicy>();
        service = new PermissionPolicyService({ repository });
    });

    describe('getMany', () => {
        it('should call preEvaluateOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.PERMISSION_READ,
                    PermissionName.PERMISSION_UPDATE,
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

        it('should call preEvaluateOneOf with correct permissions', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.getOne(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.PERMISSION_READ,
                    PermissionName.PERMISSION_UPDATE,
                ],
            });
        });
    });

    describe('create', () => {
        it('should create entity and propagate realm ids', async () => {
            const permissionRealmId = randomUUID();
            const policyRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.permission = { realmId: permissionRealmId };
                data.policy = { realmId: policyRealmId };
            });

            const data = {
                permissionId: randomUUID(),
                policyId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.permissionRealmId).toBe(permissionRealmId);
            expect(result.policyRealmId).toBe(policyRealmId);
        });

        it('should call preEvaluate with PERMISSION_UPDATE', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { realmId: null };
                data.policy = { realmId: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                permissionId: randomUUID(),
                policyId: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    permissionId: randomUUID(),
                    policyId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError on duplicate permissionId + policyId', async () => {
            const permissionId = randomUUID();
            const policyId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.permission = { realmId: null };
                data.policy = { realmId: null };
            });

            repository.seed({ permissionId, policyId });

            await expect(
                service.create({
                    permissionId,
                    policyId,
                }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });

        it('should throw validation error when permissionId is missing', async () => {
            await expect(
                service.create({ policyId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permissionId/);
        });

        it('should throw validation error when policyId is missing', async () => {
            await expect(
                service.create({ permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/policyId/);
        });

        it('should throw validation error when permissionId is not a valid UUID', async () => {
            await expect(
                service.create({ permissionId: 'not-a-uuid', policyId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permissionId/);
        });

        it('should throw validation error when policyId is not a valid UUID', async () => {
            await expect(
                service.create({ permissionId: randomUUID(), policyId: 'not-a-uuid' }, createAllowAllActor()),
            ).rejects.toThrow(/policyId/);
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

        it('should call preEvaluate with PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.PERMISSION_UPDATE });
        });
    });
});
