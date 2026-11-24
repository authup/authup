/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName, ROLE_ADMIN_NAME, ROLE_REALM_ADMIN_NAME } from '@authup/core-kit';
import type {
    Permission,
    PermissionPolicy,
    RolePermission,
} from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import {
    BuiltInPolicyType,
    PermissionError,
    RealmScope,
    SystemPolicyName,
} from '@authup/access';
import { ErrorCode } from '@authup/errors';
import { applyQuery } from '@rapiq/adapter-memory';
import { permissionSchema } from '../../../../../src/core/entities/permission/schema.ts';
import { PermissionService } from '../../../../../src/core/entities/permission/service.ts';
import { decodeQuery } from '../../../../../src/core/query/index.ts';
import {
    FakeEntityRepository,
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import { FakePolicyRepository } from '../policy/fake-repository.ts';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { createClientMatchActor, readEvaluatedRecordRealms } from '../../helpers/index.ts';
import { FakeRoleRepository } from '../role/fake-repository.ts';
import { FakePermissionRepository } from './fake-repository.ts';
import { createFakePermission } from '../../../../utils/domains/index.ts';

const defaultPolicyId = randomUUID();

describe('core/entities/permission/service', () => {
    let repository: FakePermissionRepository;
    let realmRepository: FakeRealmRepository;
    let roleRepository: FakeRoleRepository;
    let rolePermissionRepository: FakeEntityRepository<RolePermission>;
    let policyRepository: FakePolicyRepository;
    let permissionPolicyRepository: FakeEntityRepository<PermissionPolicy>;
    let service: PermissionService;

    beforeEach(() => {
        repository = new FakePermissionRepository();
        realmRepository = new FakeRealmRepository();
        roleRepository = new FakeRoleRepository();
        roleRepository.seed([{
            id: randomUUID(),
            name: ROLE_ADMIN_NAME,
            builtIn: true,
            realmId: null,
        }]);
        rolePermissionRepository = new FakeEntityRepository<RolePermission>();
        policyRepository = new FakePolicyRepository();
        policyRepository.seed([{
            id: defaultPolicyId,
            name: SystemPolicyName.DEFAULT,
            type: 'composite',
            builtIn: true,
            realmId: null,
        }]);
        permissionPolicyRepository = new FakeEntityRepository<PermissionPolicy>();
        service = new PermissionService({
            repository,
            realmRepository,
            roleRepository,
            rolePermissionRepository,
            policyRepository,
            permissionPolicyRepository,
        });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([
                createFakePermission(),
            ]);

            const result = await service.getMany({}, createAllowAllActor());

            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with permission permissions', async () => {
            const actor = createAllowAllActor();

            await service.getMany({}, actor);

            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.PERMISSION_READ,
                    PermissionName.PERMISSION_UPDATE,
                    PermissionName.PERMISSION_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.getMany({}, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakePermission({ name: 'test-perm' }));

            const result = await service.getOne(entity.id, createAllowAllActor());

            expect(result.name).toBe('test-perm');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.getOne('non-existent-id', createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('create', () => {
        it('should create a permission with valid data', async () => {
            const result = await service.create(
                { name: 'new-permission' },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-permission');
        });

        it('should call preCheck with PERMISSION_CREATE', async () => {
            const actor = createAllowAllActor();

            await service.create({ name: 'test-perm' }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.PERMISSION_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'test-perm' }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should assign default policy via junction on create', async () => {
            await service.create(
                { name: 'new-perm' },
                createAllowAllActor(),
            );

            const junctions = permissionPolicyRepository.getAll();

            expect(junctions).toHaveLength(1);
            expect(junctions[0].policyId).toBe(defaultPolicyId);
        });

        it('should grant the created permission to the admin role', async () => {
            const permission = await service.create(
                { name: 'new-perm' },
                createAllowAllActor(),
            );

            const grants = rolePermissionRepository.getAll();
            const adminGrant = grants.find((g) => g.permissionId === permission.id);

            expect(adminGrant).toBeDefined();
            expect(adminGrant!.realmScope).toBe(RealmScope.ANY);
        });

        it.each([
            PermissionName.ROLE_PERMISSION_UPDATE,
            PermissionName.KEY_CREATE,
            PermissionName.SESSION_DELETE,
        ])('should grant %s to realm_admin at the reach provisioning gives it', async (name) => {
            const realmAdmin = roleRepository.seed({
                id: randomUUID(),
                name: ROLE_REALM_ADMIN_NAME,
                builtIn: true,
                realmId: null,
            });

            const permission = await service.create({ name }, createAllowAllActor());

            const grant = rolePermissionRepository.getAll()
                .find((g) => g.permissionId === permission.id && g.roleId === realmAdmin.id);

            expect(grant!.realmScope).toBe(RealmScope.OWN);
        });

        it('should throw when the admin role is not provisioned', async () => {
            const emptyRoleRepository = new FakeRoleRepository();
            const serviceWithoutAdmin = new PermissionService({
                repository,
                realmRepository,
                roleRepository: emptyRoleRepository,
                rolePermissionRepository,
                policyRepository,
                permissionPolicyRepository,
            });

            await expect(
                serviceWithoutAdmin.create({ name: 'stranded-perm' }, createAllowAllActor()),
            ).rejects.toThrow(/admin role is not provisioned/);

            // The half-wired permission must be rolled back, not left committed.
            expect(repository.getAll()).toHaveLength(0);
        });

        it('should roll back the created permission when post-save wiring fails', async () => {
            const failure = new Error('binding write failed');

            permissionPolicyRepository.save = async () => {
                throw failure;
            };

            await expect(
                service.create({ name: 'doomed-perm' }, createAllowAllActor()),
            ).rejects.toThrow(failure);

            // Compensating cleanup removed the committed permission row.
            expect(repository.getAll()).toHaveLength(0);
        });
    });

    describe('update', () => {
        it('should update an existing permission', async () => {
            const entity = repository.seed(createFakePermission({
                name: 'old-perm',
                builtIn: false,
            }));

            const result = await service.update(
                entity.id,
                { description: 'updated' },
                createAllowAllActor(),
            );

            expect(result.description).toBe('updated');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { description: 'x' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should prevent renaming a built-in permission', async () => {
            const entity = repository.seed(createFakePermission({
                name: 'built-in-perm',
                builtIn: true,
            }));

            await expect(
                service.update(entity.id, { name: 'renamed-perm' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should allow updating built-in permission fields other than name', async () => {
            const entity = repository.seed(createFakePermission({
                name: 'built-in-perm',
                builtIn: true,
            }));

            const result = await service.update(
                entity.id,
                { description: 'updated description' },
                createAllowAllActor(),
            );

            expect(result.description).toBe('updated description');
        });
    });

    describe('update with a restricted grant (#3654)', () => {
        const restrictedActor = () => {
            const actor = createAllowAllActor();

            actor.permissionEvaluator.setBehavior(({ method, ctx }) => {
                if (method !== 'evaluate') {
                    return;
                }

                const attributes = ctx.data?.get<Record<string, any>>(BuiltInPolicyType.ATTRIBUTES);

                if (!attributes?.name?.startsWith('reach-')) {
                    throw PermissionError.denied('out of reach');
                }
            });

            return actor;
        };

        it('should evaluate the stored and the updated row in the permission\'s realm', async () => {
            const realmId = randomUUID();
            const entity = repository.seed(createFakePermission({
                name: 'reach-name',
                builtIn: false,
                realmId,
            }));
            const actor = createAllowAllActor();

            await service.update(entity.id, { name: 'reach-renamed' }, actor);
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.PERMISSION_UPDATE))
                .toEqual([realmId, realmId]);
        });

        it('should refuse moving an unreachable permission into reach', async () => {
            const entity = repository.seed(createFakePermission({ name: 'other-name', builtIn: false }));

            await expect(
                service.update(entity.id, { name: 'reach-name' }, restrictedActor()),
            ).rejects.toBeInstanceOf(PermissionError);
            expect(repository.getAll().find((e) => e.id === entity.id)?.name).toBe('other-name');
        });

        it('should allow updating a reachable permission that stays reachable', async () => {
            const entity = repository.seed(createFakePermission({ name: 'reach-name', builtIn: false }));

            const result = await service.update(entity.id, { name: 'reach-renamed' }, restrictedActor());

            expect(result.name).toBe('reach-renamed');
        });

        it('should refuse moving a reachable permission out of reach', async () => {
            const entity = repository.seed(createFakePermission({ name: 'reach-name', builtIn: false }));

            await expect(
                service.update(entity.id, { name: 'other-name' }, restrictedActor()),
            ).rejects.toBeInstanceOf(PermissionError);
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const {
                entity,
                created,
            } = await service.save(
                undefined,
                { name: 'upserted-perm' },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-perm');
        });

        it('should update when entity found', async () => {
            const entity = repository.seed(createFakePermission({
                name: 'old-perm',
                builtIn: false,
            }));

            const { created } = await service.save(
                entity.id,
                { description: 'updated' },
                createAllowAllActor(),
            );

            expect(created).toBe(false);
        });

        it('should throw NotFoundError with updateOnly when entity missing', async () => {
            await expect(
                service.save('non-existent-id', { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('realm defaulting', () => {
        it('should create a global row when realmId is absent', async () => {
            const result = await service.create({ name: 'permission-no-realm' }, createNonMasterRealmActor(randomUUID()));

            expect(result.realmId).toBeNull();
        });

        it('should treat realmId: null like an absent realmId', async () => {
            const actor = createMasterRealmActor();

            const absent = await service.create({ name: 'permission-absent' }, actor);
            const explicit = await service.create({ name: 'permission-explicit', realmId: null }, actor);

            expect(absent.realmId).toBeNull();
            expect(explicit.realmId).toBeNull();
        });

        it('should evaluate the create gate against the global realm when realmId is absent', async () => {
            const actor = createMasterRealmActor();

            await service.create({ name: 'permission-gated' }, actor);

            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.PERMISSION_CREATE).at(-1)).toBeNull();
        });

        it('should preserve realmId: null when explicitly provided on create', async () => {
            const actor = createNonMasterRealmActor();

            const result = await service.create(
                {
                    name: 'global-perm',
                    realmId: null,
                },
                actor,
            );

            expect(result.realmId).toBeNull();
        });
        describe('owning client', () => {
            const clientId = randomUUID();
            const clientRealmId = randomUUID();

            beforeEach(() => {
                repository.onValidateJoinColumns((input) => {
                    if (input.clientId === clientId) {
                        input.client = { id: clientId, realmId: clientRealmId } as Permission['client'];
                    }
                });
            });

            it('should take the client realm when realmId is absent', async () => {
                const actor = createMasterRealmActor();

                const result = await service.create({ name: 'permission-client-owned', clientId }, actor);

                expect(result.realmId).toBe(clientRealmId);
                expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.PERMISSION_CREATE).at(-1)).toBe(clientRealmId);
            });

            it('should take the client realm when realmId is null', async () => {
                const result = await service.create(
                    {
                        name: 'permission-client-null',
                        clientId,
                        realmId: null,
                    },
                    createMasterRealmActor(),
                );

                expect(result.realmId).toBe(clientRealmId);
            });

            it('should accept the client realm when given', async () => {
                const result = await service.create(
                    {
                        name: 'permission-client-match',
                        clientId,
                        realmId: clientRealmId,
                    },
                    createMasterRealmActor(),
                );

                expect(result.realmId).toBe(clientRealmId);
            });

            it('should refuse a realm other than the client realm', async () => {
                await expect(service.create(
                    {
                        name: 'permission-client-mismatch',
                        clientId,
                        realmId: randomUUID(),
                    },
                    createMasterRealmActor(),
                )).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
            });
        });
    });

    describe('delete', () => {
        it('should delete a non-built-in permission', async () => {
            const entity = repository.seed(createFakePermission({ builtIn: false }));

            const result = await service.delete(entity.id, createAllowAllActor());

            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.delete('non-existent-id', createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should prevent deletion of built-in permissions', async () => {
            const entity = repository.seed(createFakePermission({ builtIn: true }));

            await expect(
                service.delete(entity.id, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should call preCheck with PERMISSION_DELETE', async () => {
            const entity = repository.seed(createFakePermission({ builtIn: false }));

            const actor = createAllowAllActor();

            await service.delete(entity.id, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.PERMISSION_DELETE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed(createFakePermission({ builtIn: false }));

            await expect(
                service.delete(entity.id, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('save by name scoped to a realm', () => {
        async function seedPair() {
            const master = await realmRepository.resolve(undefined, true);
            const seedEntity = (name: string, realmId: string | null) => repository.seed(createFakePermission({ name, realmId }));
            // the realm row comes first, so an unscoped lookup would find it
            const scoped = seedEntity('name-scoped', master.id);
            const global = seedEntity('name-scoped', null);

            return {
                master,
                global,
                scoped,
            };
        }

        it('should address the global row when realmId is absent', async () => {
            const { global, scoped } = await seedPair();

            const { entity, created } = await service.save('name-scoped', { description: 'changed' }, createAllowAllActor());

            expect(created).toBe(false);
            expect(entity.id).toBe(global.id);
            expect(scoped.description).not.toBe('changed');
        });

        it('should address the global row when realmId is null', async () => {
            const { global } = await seedPair();

            const { entity } = await service.save('name-scoped', { description: 'changed', realmId: null }, createAllowAllActor());

            expect(entity.id).toBe(global.id);
        });

        it('should address the realm row when realmId is given', async () => {
            const { master, scoped } = await seedPair();

            const { entity } = await service.save('name-scoped', { description: 'changed', realmId: master.name }, createAllowAllActor());

            expect(entity.id).toBe(scoped.id);
        });

        it('should look a uuid key up by id alone', async () => {
            const { scoped } = await seedPair();

            const { entity } = await service.save(scoped.id, { description: 'changed' }, createAllowAllActor());

            expect(entity.id).toBe(scoped.id);
        });

        it('should refuse a realm key that does not resolve', async () => {
            await seedPair();

            await expect(
                service.save('name-scoped', { description: 'changed', realmId: 'unknown-realm' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });
    });
    describe('save by name with an owning client', () => {
        it('should not address a client owned row when no client is given', async () => {
            const owned = repository.seed(createFakePermission({
                name: 'name-owned',
                realmId: null,
                clientId: randomUUID(),
            }));

            const { entity, created } = await service.save('name-owned', { name: 'name-owned', description: 'changed' }, createMasterRealmActor());

            expect(created).toBe(true);
            expect(entity.id).not.toEqual(owned.id);
            expect(entity.clientId ?? null).toBeNull();
            expect(owned.description).not.toEqual('changed');
        });

        it('should address the client owned row when its client is given', async () => {
            const clientId = randomUUID();
            const clientRealmId = randomUUID();

            repository.onValidateJoinColumns((input) => {
                if (input.clientId === clientId) {
                    input.client = { id: clientId, realmId: clientRealmId } as Permission['client'];
                }
            });

            const global = repository.seed(createFakePermission({ name: 'name-owned', realmId: null }));
            const owned = repository.seed(createFakePermission({
                name: 'name-owned',
                realmId: clientRealmId,
                clientId,
            }));

            const { entity, created } = await service.save(
                'name-owned',
                { description: 'changed', clientId },
                createMasterRealmActor(),
            );

            expect(created).toBe(false);
            expect(entity.id).toEqual(owned.id);
            expect(global.description).not.toEqual('changed');
        });

        it('should not look the client up for a caller who may not write', async () => {
            let lookups = 0;

            repository.onValidateJoinColumns(() => {
                lookups++;
            });

            await expect(service.save('name-owned', { clientId: randomUUID() }, createDenyAllActor())).rejects.toThrow();
            expect(lookups).toBe(0);
        });
    });
    describe('owning client (clientMatch)', () => {
        const realmId = randomUUID();
        const otherRealmId = randomUUID();
        const clientId = randomUUID();
        const otherClientId = randomUUID();
        const otherRealmClientId = randomUUID();

        const names = [
            PermissionName.PERMISSION_CREATE,
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ];

        const clientRealms: Record<string, string> = {
            [clientId]: realmId,
            [otherClientId]: realmId,
            [otherRealmClientId]: otherRealmId,
        };

        let owned: Permission;
        let foreign: Permission;
        let global: Permission;
        let otherRealm: Permission;

        beforeEach(() => {
            repository.onValidateJoinColumns((input) => {
                if (typeof input.clientId === 'string' && clientRealms[input.clientId]) {
                    input.client = { id: input.clientId, realmId: clientRealms[input.clientId] } as Permission['client'];
                }
            });

            vi.spyOn(repository, 'findMany').mockImplementation(async (query) => {
                const { data } = applyQuery(query, repository.getAll());

                return {
                    data,
                    meta: {
                        total: data.length,
                        offset: 0,
                        limit: 50,
                    },
                };
            });

            [owned, foreign, global, otherRealm] = repository.seed([
                createFakePermission({ realmId, clientId }),
                createFakePermission({ realmId, clientId: otherClientId }),
                createFakePermission({ realmId: null, clientId: null }),
                createFakePermission({ realmId: otherRealmId, clientId: otherRealmClientId }),
            ]);
        });

        const createActor = (unrestricted?: boolean) => createClientMatchActor({
            clientId,
            realmId,
            names,
            unrestricted,
        });

        it('should create a permission the actor owns', async () => {
            const entity = await service.create({ name: 'owned-create', clientId }, await createActor());

            expect(entity.clientId).toEqual(clientId);
            expect(entity.realmId).toEqual(realmId);
        });

        it('should refuse a permission another client owns', async () => {
            await expect(service.create({ name: 'foreign-create', clientId: otherClientId }, await createActor()))
                .rejects.toThrow(PermissionError);
        });

        it('should refuse a permission no client owns', async () => {
            await expect(service.create({ name: 'unowned-create', realmId }, await createActor()))
                .rejects.toThrow(PermissionError);
        });

        it('should update an owned permission', async () => {
            const entity = await service.update(owned.id, { description: 'changed by owner' }, await createActor());

            expect(entity.description).toEqual('changed by owner');
        });

        it('should refuse to update a foreign or global permission', async () => {
            const actor = await createActor();

            await expect(service.update(foreign.id, { description: 'changed by stranger' }, actor))
                .rejects.toThrow(PermissionError);
            await expect(service.update(global.id, { description: 'changed by stranger' }, actor))
                .rejects.toThrow(PermissionError);
        });

        it('should not move the ownership on update', async () => {
            const entity = await service.update(owned.id, { clientId: otherClientId }, await createActor());

            expect(entity.clientId).toEqual(clientId);

            expect((await repository.findOneById(owned.id))!.clientId).toEqual(clientId);
        });

        it('should delete an owned permission', async () => {
            await service.delete(owned.id, await createActor());

            expect(await repository.findOneById(owned.id)).toBeNull();
        });

        it('should refuse to delete a foreign or global permission', async () => {
            const actor = await createActor();

            await expect(service.delete(foreign.id, actor)).rejects.toThrow(PermissionError);
            await expect(service.delete(global.id, actor)).rejects.toThrow(PermissionError);
        });

        it('should list only owned permissions', async () => {
            const actor = await createActor();
            const scope = await service.scopeRead(await decodeQuery({}, { schema: permissionSchema, actor }), actor);

            expect(scope.post).toBe(false);

            const result = await service.getMany({}, actor);

            expect(result.data.map((row) => row.id)).toEqual([owned.id]);
        });

        it('should list only owned permissions under a projection', async () => {
            const result = await service.getMany({ fields: 'name' }, await createActor());

            expect(result.data.map((row) => row.name)).toEqual([owned.name]);
        });

        it('should list only owned permissions under a projection checked per row', async () => {
            const actor = await createClientMatchActor({
                clientId,
                realmId,
                names,
                policy: {
                    type: BuiltInPolicyType.COMPOSITE,
                    children: [
                        { type: BuiltInPolicyType.CLIENT_MATCH },
                        {
                            type: BuiltInPolicyType.ATTRIBUTE_NAMES, 
                            invert: true, 
                            names: ['secret'], 
                        },
                    ],
                },
            });
            const scope = await service.scopeRead(await decodeQuery({ fields: 'name' }, { schema: permissionSchema, actor }), actor);

            expect(scope.post).toBe(true);

            const result = await service.getMany({ fields: 'name' }, actor);

            expect(result.data.map((row) => row.name)).toEqual([owned.name]);
            expect(result.data[0]).toHaveProperty('clientId', clientId);
        });

        it('should list every reached permission for an unrestricted grant', async () => {
            const result = await service.getMany({}, await createActor(true));

            expect(result.data.map((row) => row.id).sort()).toEqual([owned.id, foreign.id].sort());
            expect(result.data.map((row) => row.id)).not.toContain(otherRealm.id);
        });

        it('should read an owned permission only', async () => {
            const actor = await createActor();

            expect((await service.getOne(owned.id, actor)).id).toEqual(owned.id);
            await expect(service.getOne(foreign.id, actor)).rejects.toThrow(PermissionError);
        });

        it('should carry the owner on every record check', async () => {
            const actor = createAllowAllActor();

            await service.getMany({}, actor);
            await service.getOne(foreign.id, actor);
            await service.create({ name: 'owner-carried', clientId }, actor);
            await service.update(foreign.id, { description: 'changed by admin' }, actor);
            await service.delete(foreign.id, actor);

            const owners = [
                ...actor.permissionEvaluator.evaluateOneOfCalls,
                ...actor.permissionEvaluator.evaluateCalls,
            ].map((call) => call.data!.get(BuiltInPolicyType.CLIENT_MATCH));

            expect(owners).not.toContain(undefined);
            expect(owners).toContain(clientId);
            expect(owners).toContain(null);
            expect(actor.permissionEvaluator.compileCalls[0]!.clientAttributeName).toEqual('clientId');
        });
    });
});
