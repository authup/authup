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
import { ConflictError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionPolicyService } from '../../../../../src/core/entities/permission-policy/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

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
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.PERMISSION_READ,
                    PermissionName.PERMISSION_UPDATE,
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

        it('should call preEvaluateOneOf with correct permissions', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.getOne(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
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
                data.permission = { realm_id: permissionRealmId };
                data.policy = { realm_id: policyRealmId };
            });

            const data = {
                permission_id: randomUUID(),
                policy_id: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.permission_realm_id).toBe(permissionRealmId);
            expect(result.policy_realm_id).toBe(policyRealmId);
        });

        it('should call preEvaluate with PERMISSION_UPDATE', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { realm_id: null };
                data.policy = { realm_id: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                permission_id: randomUUID(),
                policy_id: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    permission_id: randomUUID(),
                    policy_id: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should throw ConflictError on duplicate permission_id + policy_id', async () => {
            const permissionId = randomUUID();
            const policyId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.permission = { realm_id: null };
                data.policy = { realm_id: null };
            });

            repository.seed({ permission_id: permissionId, policy_id: policyId });

            await expect(
                service.create({
                    permission_id: permissionId,
                    policy_id: policyId,
                }, createAllowAllActor()),
            ).rejects.toThrow(ConflictError);
        });

        it('should throw validation error when permission_id is missing', async () => {
            await expect(
                service.create({ policy_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permission_id/);
        });

        it('should throw validation error when policy_id is missing', async () => {
            await expect(
                service.create({ permission_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/policy_id/);
        });

        it('should throw validation error when permission_id is not a valid UUID', async () => {
            await expect(
                service.create({ permission_id: 'not-a-uuid', policy_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permission_id/);
        });

        it('should throw validation error when policy_id is not a valid UUID', async () => {
            await expect(
                service.create({ permission_id: randomUUID(), policy_id: 'not-a-uuid' }, createAllowAllActor()),
            ).rejects.toThrow(/policy_id/);
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

        it('should call preEvaluate with PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.PERMISSION_UPDATE });
        });
    });
});
