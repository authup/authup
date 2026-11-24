/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { Role, UserRole } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { UserRoleService } from '../../../../../src/core/entities/user-role/service.ts';
import {
    FakeEntityRepository,
    FakePermissionEvaluator,
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import type { EvaluatorBehavior } from '@authup/server-test-kit';
import type { PermissionPolicyBinding, PolicyData } from '@authup/access';
import {
    BuiltInPolicyType,
    PermissionError,
    RealmScope,
    realmScopeMatches,
} from '@authup/access';
import type { IClientRepository, IRoleRepository, IUserRepository } from '../../../../../src/core/entities/index.ts';
import { IdentityPermissionProvider } from '../../../../../src/core/identity/permission/module.ts';
import type { IIdentityRoleProvider } from '../../../../../src/core/identity/role/types.ts';
import { FakeIdentityPermissionProvider } from '../../helpers/fake-identity-permission-provider.ts';
import { createClientMatchActor } from '../../helpers/index.ts';

describe('core/entities/user-role/service', () => {
    let repository: FakeEntityRepository<UserRole>;
    let service: UserRoleService;

    let identityPermissionProvider: FakeIdentityPermissionProvider;

    beforeEach(() => {
        // a stored junction row always carries its owner realm column, and a
        // create stamps it from the join-loaded owner
        repository = new FakeEntityRepository<UserRole>({ defaults: { userRealmId: null } });
        repository.onValidateJoinColumns((data: any) => {
            data.user = { realmId: null };
        });
        identityPermissionProvider = new FakeIdentityPermissionProvider();
        service = new UserRoleService({
            repository, 
            roleRepository: new FakeEntityRepository<Role>(), 
            identityPermissionProvider, 
        });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();

            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.USER_ROLE_READ,
                    PermissionName.USER_ROLE_CREATE,
                    PermissionName.USER_ROLE_UPDATE,
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
            const userRealmId = randomUUID();
            const roleRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.user = { realmId: userRealmId };
                data.role = { realmId: roleRealmId };
            });

            const data = {
                userId: randomUUID(),
                roleId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());

            expect(result.id).toBeDefined();
            expect(result.userRealmId).toBe(userRealmId);
            expect(result.roleRealmId).toBe(roleRealmId);
        });

        it('should run the superset check with the actor\'s evaluator', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.user = { realmId: null };
                data.role = { realmId: null, clientId: null };
            });

            const actor = createMasterRealmActor();

            await service.create({
                userId: randomUUID(),
                roleId: randomUUID(),
            }, actor);

            expect(identityPermissionProvider.supersetActors).toEqual([
                { permissionEvaluator: actor.permissionEvaluator },
            ]);
        });

        it('should call preCheck with USER_ROLE_CREATE', async () => {
            const actor = createAllowAllActor();

            await service.create({
                userId: randomUUID(),
                roleId: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_ROLE_CREATE });
        });

        it('should throw validation error when userId is missing', async () => {
            await expect(
                service.create({ roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/userId/);
        });

        it('should throw validation error when roleId is missing', async () => {
            await expect(
                service.create({ userId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/roleId/);
        });

        it('should throw validation error when userId is not a valid UUID', async () => {
            await expect(
                service.create({ userId: 'not-a-uuid', roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/userId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    userId: randomUUID(),
                    roleId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ForbiddenError when actor does not own role permissions (superset check)', async () => {
            const identityPermissionProviderDeny = new FakeIdentityPermissionProvider();

            identityPermissionProviderDeny.setSuperset(false);

            const svc = new UserRoleService({
                repository, 
                roleRepository: new FakeEntityRepository<Role>(), 
                identityPermissionProvider: identityPermissionProviderDeny, 
            });

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: null, clientId: null };
                data.user = { realmId: null };
            });

            await expect(
                svc.create({
                    userId: randomUUID(),
                    roleId: randomUUID(),
                }, createMasterRealmActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const roleId = randomUUID();
            const userId = randomUUID();

            repository.seed({ roleId, userId });

            await expect(
                service.create({ roleId, userId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});
            const result = await service.delete(entity.id, createAllowAllActor());

            expect(result.id).toBe(entity.id);
        });

        it('should call preCheck with USER_ROLE_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();

            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_ROLE_DELETE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    // #3855: whoever manages the permission definitions of a realm may assign
    // a role over that realm's own (realm- or client-owned) permissions.
    describe('create over realm- and client-owned permissions', () => {
        const realmA = randomUUID();
        const realmB = randomUUID();
        const roleId = randomUUID();

        function createService(roleBindings: PermissionPolicyBinding[]) {
            return new UserRoleService({
                repository,
                roleRepository: new FakeEntityRepository<Role>(),
                identityPermissionProvider: new IdentityPermissionProvider({
                    roleRepository: {
                        getBoundPermissions: async () => roleBindings,
                        getBoundPermissionsForMany: async () => [],
                    } as unknown as IRoleRepository,
                    clientRepository: {} as IClientRepository,
                    userRepository: {} as IUserRepository,
                    roleProvider: { getRolesFor: async () => [] } as unknown as IIdentityRoleProvider,
                }),
            });
        }

        function ownedBy(realmId: string): PermissionPolicyBinding[] {
            return [
                {
                    permission: {
                        name: 'p1',
                        realmId,
                        clientId: null,
                    },
                },
                {
                    permission: {
                        name: 'p2',
                        realmId,
                        clientId: randomUUID(),
                    },
                },
            ];
        }

        // The request evaluator's permission_update gate, as system.default
        // decides it: some grant of the actor reaches the permission's realm.
        function createGate(realmId: string, held: PermissionPolicyBinding[]): EvaluatorBehavior {
            return ({ method, ctx }) => {
                if (method !== 'evaluate' || ctx.name !== PermissionName.PERMISSION_UPDATE) {
                    return;
                }

                const realm = (ctx.data as PolicyData).get(BuiltInPolicyType.REALM_MATCH) as string | null;
                const reached = held.some((grant) => grant.permission.name === PermissionName.PERMISSION_UPDATE &&
                    realmScopeMatches(grant.realmScope, realm, realmId));

                if (!reached) {
                    throw PermissionError.denied(PermissionName.PERMISSION_UPDATE);
                }
            };
        }

        function createActor(realmId: string, grants: PermissionPolicyBinding[]) {
            const actor = createNonMasterRealmActor(realmId);

            actor.grants = async () => grants;
            actor.permissionEvaluator.setBehavior(createGate(realmId, grants));
            actor.narrowGrants = (named) => new FakePermissionEvaluator(createGate(
                realmId,
                grants.filter((grant) => named.includes(grant)),
            ));

            return actor;
        }

        function managing(realmScope: `${RealmScope}`): PermissionPolicyBinding {
            return {
                permission: {
                    name: PermissionName.PERMISSION_UPDATE,
                    realmId: null,
                    clientId: null,
                },
                realmScope,
            };
        }

        beforeEach(() => {
            repository.onValidateJoinColumns((data: any) => {
                data.user = { realmId: realmA };
                data.role = { realmId: realmA };
            });
        });

        it('should let an actor managing every realm assign the role', async () => {
            const svc = createService(ownedBy(realmB));

            await expect(svc.create(
                { userId: randomUUID(), roleId },
                createActor(realmA, [managing(RealmScope.ANY)]),
            )).resolves.toBeDefined();
        });

        it('should let an actor managing its own realm assign a role over that realm', async () => {
            const svc = createService(ownedBy(realmA));

            await expect(svc.create(
                { userId: randomUUID(), roleId },
                createActor(realmA, [managing(RealmScope.OWN)]),
            )).resolves.toBeDefined();
        });

        it('should refuse an actor managing its own realm a role over another realm', async () => {
            const svc = createService(ownedBy(realmB));

            await expect(svc.create(
                { userId: randomUUID(), roleId },
                createActor(realmA, [managing(RealmScope.OWN)]),
            )).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should refuse an actor that does not manage permissions', async () => {
            const svc = createService(ownedBy(realmA));

            await expect(svc.create(
                { userId: randomUUID(), roleId },
                createActor(realmA, [{
                    permission: {
                        name: PermissionName.USER_ROLE_CREATE,
                        realmId: null,
                        clientId: null,
                    },
                    realmScope: RealmScope.ANY,
                }]),
            )).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should keep requiring a global permission the actor does not hold', async () => {
            const svc = createService([{
                permission: {
                    name: 'user_read',
                    realmId: null,
                    clientId: null,
                },
            }]);

            await expect(svc.create(
                { userId: randomUUID(), roleId },
                createActor(realmA, [managing(RealmScope.ANY)]),
            )).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });
});

describe('core/entities/user-role/service: owning client (clientMatch)', () => {
    const realmId = randomUUID();
    const clientId = randomUUID();
    const otherClientId = randomUUID();

    const names = [
        PermissionName.USER_ROLE_CREATE,
        PermissionName.USER_ROLE_READ,
        PermissionName.USER_ROLE_UPDATE,
        PermissionName.USER_ROLE_DELETE,
    ];

    let repository: FakeEntityRepository<UserRole>;
    let roleRepository: FakeEntityRepository<Role>;
    let service: UserRoleService;

    let owned: Role;
    let foreign: Role;
    let global: Role;

    beforeEach(() => {
        repository = new FakeEntityRepository<UserRole>({ defaults: { userRealmId: realmId } });
        roleRepository = new FakeEntityRepository<Role>();
        service = new UserRoleService({
            repository,
            roleRepository,
            identityPermissionProvider: new FakeIdentityPermissionProvider(),
        });

        [owned, foreign, global] = roleRepository.seed([
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
            data.user = { realmId };
            data.role = roleRepository.getAll().find((role) => role.id === data.roleId);
        });
    });

    const createActor = () => createClientMatchActor({
        clientId, 
        realmId, 
        names, 
    });

    const bind = (role: Role) => repository.seed({
        userId: randomUUID(),
        roleId: role.id,
        roleRealmId: role.realmId,
    });

    it('should assign an owned role only', async () => {
        const actor = await createActor();

        await expect(service.create({ userId: randomUUID(), roleId: owned.id }, actor)).resolves.toBeDefined();
        await expect(service.create({ userId: randomUUID(), roleId: foreign.id }, actor))
            .rejects.toThrow(PermissionError);
        await expect(service.create({ userId: randomUUID(), roleId: global.id }, actor))
            .rejects.toThrow(PermissionError);
    });

    it('should read an assignment of an owned role only', async () => {
        const actor = await createActor();
        const ownedBinding = bind(owned);

        expect((await service.getOne(ownedBinding.id, actor)).id).toEqual(ownedBinding.id);
        await expect(service.getOne(bind(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.getOne(bind(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should list assignments of owned roles only, with one lookup', async () => {
        bind(owned);
        bind(foreign);
        bind(global);
        bind(owned);

        const lookup = vi.spyOn(roleRepository, 'findManyBy');

        const result = await service.getMany({}, await createActor());

        expect(result.data.map((row) => row.roleId)).toEqual([owned.id, owned.id]);
        expect(lookup).toHaveBeenCalledTimes(1);
    });

    it('should delete an assignment of an owned role only', async () => {
        const actor = await createActor();

        await expect(service.delete(bind(owned).id, actor)).resolves.toBeDefined();
        await expect(service.delete(bind(foreign).id, actor)).rejects.toThrow(PermissionError);
        await expect(service.delete(bind(global).id, actor)).rejects.toThrow(PermissionError);
    });

    it('should carry the owner on every record check', async () => {
        const actor = createAllowAllActor();

        await service.getMany({}, actor);
        await service.getOne(bind(foreign).id, actor);
        await service.create({ userId: randomUUID(), roleId: owned.id }, actor);
        await service.delete(bind(global).id, actor);

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
