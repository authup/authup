/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { RoleAttribute } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { RoleAttributeService } from '../../../../../src/core/entities/role-attribute/service.ts';
import { FakeEntityRepository, createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';
import { createFakeRoleAttribute } from '../../../../utils/domains/index.ts';

describe('core/entities/role-attribute/service', () => {
    let repository: FakeEntityRepository<RoleAttribute>;
    let service: RoleAttributeService;

    beforeEach(() => {
        repository = new FakeEntityRepository<RoleAttribute>();
        service = new RoleAttributeService({ repository });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([
                createFakeRoleAttribute({ roleId: randomUUID() }),
            ]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should filter out entities that fail per-record permission check', async () => {
            const [, denied] = repository.seed([
                createFakeRoleAttribute({
                    name: 'allowed',
                    roleId: 'role-1', 
                }),
                createFakeRoleAttribute({
                    name: 'denied',
                    roleId: 'role-2', 
                }),
            ]);

            const actor = createAllowAllActor();
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluateOneOf' && call.ctx.data) {
                    const entity = call.ctx.data.get('attributes') as RoleAttribute;
                    if (entity && entity.id === denied.id) {
                        throw PermissionError.denied('test');
                    }
                }
            });

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('allowed');
            expect(result.meta.total).toBe(1);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakeRoleAttribute());
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('create', () => {
        it('should create entity and set realmId from role', async () => {
            const roleRealmId = randomUUID();
            const data = {
                name: 'new-attr',
                value: 'val',
                roleId: randomUUID(),
                role: { realmId: roleRealmId },
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.realmId).toBe(roleRealmId);
        });

        it('should use ROLE_UPDATE permission (not a separate attribute permission)', async () => {
            const actor = createAllowAllActor();
            await service.create({
                name: 'attr',
                value: 'val',
                roleId: randomUUID(),
                role: { realmId: null },
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    name: 'attr',
                    roleId: randomUUID(),
                    role: { realmId: null },
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('evaluates ROLE_UPDATE against the role realm (denies a foreign-realm role)', async () => {
            // Simulate an own-scoped ROLE_UPDATE grant in realm-a: deny when the evaluated
            // resource realm (realmMatch) is a different realm. Before the realm context was
            // wired into create, realmMatch was absent and this neutral-passed (cross-realm leak).
            const actor = createAllowAllActor();
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluate' && call.ctx.name === PermissionName.ROLE_UPDATE) {
                    const realm = call.ctx.data?.has(BuiltInPolicyType.REALM_MATCH) ?
                        call.ctx.data.get(BuiltInPolicyType.REALM_MATCH) :
                        undefined;
                    if (typeof realm !== 'undefined' && realm !== 'realm-a') {
                        throw PermissionError.denied('realm');
                    }
                }
            });

            await expect(service.create({
                name: 'attr', 
                value: 'v', 
                roleId: randomUUID(), 
                role: { realmId: 'realm-a' },
            }, actor)).resolves.toBeDefined();

            await expect(service.create({
                name: 'attr', 
                value: 'v', 
                roleId: randomUUID(), 
                role: { realmId: 'realm-b' },
            }, actor)).rejects.toBeInstanceOf(PermissionError);
        });
    });

    describe('update', () => {
        it('should update an existing attribute', async () => {
            const entity = repository.seed(createFakeRoleAttribute({
                name: 'old',
                value: 'old-val', 
            }));

            const result = await service.update(entity.id, { value: 'new-val' }, createAllowAllActor());
            expect(result.value).toBe('new-val');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { value: 'x' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('evaluates ROLE_UPDATE against the attribute realm (denies a foreign-realm attribute)', async () => {
            const entity = repository.seed(createFakeRoleAttribute({ realmId: 'realm-b' } as Partial<RoleAttribute>));
            const actor = createAllowAllActor();
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluate' && call.ctx.name === PermissionName.ROLE_UPDATE) {
                    const realm = call.ctx.data?.has(BuiltInPolicyType.REALM_MATCH) ?
                        call.ctx.data.get(BuiltInPolicyType.REALM_MATCH) :
                        undefined;
                    if (typeof realm !== 'undefined' && realm !== 'realm-a') {
                        throw PermissionError.denied('realm');
                    }
                }
            });

            await expect(
                service.update(entity.id, { value: 'x' }, actor),
            ).rejects.toBeInstanceOf(PermissionError);
        });

        it('ignores a caller-supplied realmId (realm stays role-derived, no gate bypass)', async () => {
            const entity = repository.seed(createFakeRoleAttribute({ realmId: 'realm-b' } as Partial<RoleAttribute>));
            const actor = createAllowAllActor();
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluate' && call.ctx.name === PermissionName.ROLE_UPDATE) {
                    const realm = call.ctx.data?.has(BuiltInPolicyType.REALM_MATCH) ?
                        call.ctx.data.get(BuiltInPolicyType.REALM_MATCH) :
                        undefined;
                    if (typeof realm !== 'undefined' && realm !== 'realm-a') {
                        throw PermissionError.denied('realm');
                    }
                }
            });

            // The actor tries to gate the write against their own realm by supplying realmId;
            // it must be ignored, so the evaluation still runs against the role realm (realm-b).
            await expect(
                service.update(entity.id, { value: 'x', realmId: 'realm-a' }, actor),
            ).rejects.toBeInstanceOf(PermissionError);
        });

        it('treats the owner role as immutable (ignores reassignment; realm stays original)', async () => {
            const entity = repository.seed(createFakeRoleAttribute({
                roleId: 'role-original',
                realmId: 'realm-a',
            } as Partial<RoleAttribute>));
            const actor = createAllowAllActor();
            let gatedRealm: unknown;
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluate' && call.ctx.name === PermissionName.ROLE_UPDATE) {
                    gatedRealm = call.ctx.data?.has(BuiltInPolicyType.REALM_MATCH) ?
                        call.ctx.data.get(BuiltInPolicyType.REALM_MATCH) :
                        undefined;
                }
            });

            // An attempt to reassign to a realm-b role must be ignored: the write is gated
            // against — and persists — the ORIGINAL role realm (realm-a), never the attempted one.
            const result = await service.update(
                entity.id,
                {
                    value: 'x', 
                    roleId: 'role-other', 
                    role: { realmId: 'realm-b' }, 
                },
                actor,
            );
            expect(gatedRealm).toBe('realm-a');
            expect(result.realmId).toBe('realm-a');
            expect(result.roleId).toBe('role-original');
        });
    });

    describe('delete', () => {
        it('should delete an existing attribute', async () => {
            const entity = repository.seed(createFakeRoleAttribute());

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should use ROLE_UPDATE permission for deletion', async () => {
            const entity = repository.seed(createFakeRoleAttribute());

            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_UPDATE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });
});
