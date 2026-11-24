/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { Permission, PermissionPolicy } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { PermissionPolicyService } from '../../../../../src/core/entities/permission-policy/service.ts';
import { FakeEntityRepository, createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';
import { createClientMatchActor } from '../../helpers/index.ts';

describe('core/entities/permission-policy/service', () => {
    let repository: FakeEntityRepository<PermissionPolicy>;
    let service: PermissionPolicyService;

    beforeEach(() => {
        // a stored junction row always carries its owner realm column, and a
        // create stamps it from the join-loaded owner
        repository = new FakeEntityRepository<PermissionPolicy>({ defaults: { permissionRealmId: null } });
        repository.onValidateJoinColumns((data: any) => {
            data.permission = { realmId: null };
        });
        service = new PermissionPolicyService({ repository, permissionRepository: new FakeEntityRepository<Permission>() });
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
            const realmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.permission = { realmId };
                data.policy = { realmId };
            });

            const data = {
                permissionId: randomUUID(),
                policyId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());

            expect(result.id).toBeDefined();
            expect(result.permissionRealmId).toBe(realmId);
            expect(result.policyRealmId).toBe(realmId);
        });

        it('should bind a global policy to a realm permission', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { realmId: randomUUID() };
                data.policy = { realmId: null };
            });

            const result = await service.create({
                permissionId: randomUUID(),
                policyId: randomUUID(),
            }, createAllowAllActor());

            expect(result.policyRealmId).toBeNull();
        });

        it.each([
            ['a realm permission', randomUUID()],
            ['a global permission', null],
        ])('should reject a policy of another realm on %s', async (_label, permissionRealmId) => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { realmId: permissionRealmId };
                data.policy = { realmId: randomUUID() };
            });

            await expect(
                service.create({
                    permissionId: randomUUID(),
                    policyId: randomUUID(),
                }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
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

describe('core/entities/permission-policy/service: owning client (clientMatch)', () => {
    const realmId = randomUUID();
    const clientId = randomUUID();
    const otherClientId = randomUUID();
    const policyId = randomUUID();

    const names = [
        PermissionName.PERMISSION_READ,
        PermissionName.PERMISSION_UPDATE,
    ];

    let repository: FakeEntityRepository<PermissionPolicy>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let service: PermissionPolicyService;

    let owned: Permission;
    let foreign: Permission;
    let global: Permission;

    beforeEach(() => {
        repository = new FakeEntityRepository<PermissionPolicy>();
        permissionRepository = new FakeEntityRepository<Permission>();
        service = new PermissionPolicyService({ repository, permissionRepository });

        [owned, foreign, global] = permissionRepository.seed([
            {
                name: 'owned', 
                realmId, 
                clientId, 
            },
            {
                name: 'foreign', 
                realmId, 
                clientId: otherClientId, 
            },
            {
                name: 'global', 
                realmId: null, 
                clientId: null, 
            },
        ]);

        repository.onValidateJoinColumns((data: any) => {
            data.permission = permissionRepository.getAll().find((permission) => permission.id === data.permissionId);
            data.policy = { id: data.policyId, realmId };
        });
    });

    const createActor = () => createClientMatchActor({
        clientId, 
        realmId, 
        names, 
    });

    // a global permission cannot sit in the actor's realm, so it is bound in it
    // to prove the owner gate refuses it, not the realm gate
    const attach = (permission: Permission) => repository.seed({
        permissionId: permission.id,
        permissionRealmId: realmId,
        policyId,
        policyRealmId: realmId,
    });

    it('should attach a policy to an owned permission only', async () => {
        const actor = await createActor();

        await expect(service.create({ permissionId: owned.id, policyId }, actor)).resolves.toBeDefined();
        await expect(service.create({ permissionId: foreign.id, policyId }, actor))
            .rejects.toThrow(PermissionError);
    });

    it('should read an attachment of an owned permission only', async () => {
        const actor = await createActor();
        const ownedAttachment = attach(owned);

        expect((await service.getOne(ownedAttachment.id, actor)).id).toEqual(ownedAttachment.id);
        await expect(service.getOne(attach(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.getOne(attach(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should list attachments of owned permissions only, with one lookup', async () => {
        attach(owned);
        attach(foreign);
        attach(global);
        attach(owned);

        const lookup = vi.spyOn(permissionRepository, 'findManyBy');

        const result = await service.getMany({}, await createActor());

        expect(result.data.map((row) => row.permissionId)).toEqual([owned.id, owned.id]);
        expect(lookup).toHaveBeenCalledTimes(1);
    });

    it('should detach a policy from an owned permission only', async () => {
        const actor = await createActor();

        await expect(service.delete(attach(owned).id, actor)).resolves.toBeDefined();
        await expect(service.delete(attach(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.delete(attach(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should carry the owner on every record check', async () => {
        const actor = createAllowAllActor();

        await service.getMany({}, actor);
        await service.getOne(attach(foreign).id, actor);
        await service.create({ permissionId: owned.id, policyId: randomUUID() }, actor);
        await service.delete(attach(global).id, actor);

        const owners = [
            ...actor.permissionEvaluator.evaluateOneOfCalls,
            ...actor.permissionEvaluator.evaluateCalls,
        ].map((call) => call.data!.get(BuiltInPolicyType.CLIENT_MATCH));

        expect(owners).not.toContain(undefined);
        expect(owners).toContain(clientId);
        expect(owners).toContain(otherClientId);
        expect(owners).toContain(null);
    });
});
