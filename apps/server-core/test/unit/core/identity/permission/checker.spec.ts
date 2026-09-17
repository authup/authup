/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { BuiltInPolicyType, PermissionEvaluator, RealmScope } from '@authup/access';
import type { Identity } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { EntityNotFoundError } from '@authup/errors';
import { createNanoID } from '@authup/kit';
import { createAllowAllActor } from '@authup/server-test-kit';
import type { ActorContext } from '@authup/server-kit';
import type { IAppEvent } from 'routup';
import type { UserEntity } from '../../../../../src';
import {
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyRepository,
    RealmEntity,
    UserPermissionEntity,
    UserRepository,
} from '../../../../../src';
import { PermissionCheckerService, PolicyEngine } from '../../../../../src/core';
import type { IIdentityPermissionProvider } from '../../../../../src/core';
import { IdentityInjectionKey } from '../../../../../src/app/modules/identity/index.ts';
import { PermissionDatabaseProvider } from '../../../../../src/app/modules/database/repositories/permission-provider/module.ts';
import { PermissionRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/permission/repository.ts';
import { RealmRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/realm/repository.ts';
import {
    RequestPermissionEvaluator,
    setRequestIdentity,
    setRequestScopes,
} from '../../../../../src/adapters/http/request';
import { createTestApplication } from '../../../../app';

describe('core/identity/permission/checker', () => {
    const suite = createTestApplication();

    let service: PermissionCheckerService;
    let adminUser: UserEntity;
    let identityPermissionProvider: IIdentityPermissionProvider;

    /**
     * The actor the controller hands the checker: the authorization
     * middleware's evaluator behind the request wrapper, and the identity
     * policies may see for the request, which a token without `global` has not.
     */
    function requestActor(identity: Identity, scopes: string[] = [ScopeName.GLOBAL]) : ActorContext {
        const event = { store: {} } as unknown as IAppEvent;
        setRequestIdentity(event, identity);
        setRequestScopes(event, scopes);

        return {
            identity: scopes.includes(ScopeName.GLOBAL) ? identity : undefined,
            permissionEvaluator: new RequestPermissionEvaluator(event, new PermissionEvaluator({
                provider: new PermissionDatabaseProvider(suite.dataSource),
                policyEngine: new PolicyEngine(identityPermissionProvider),
            })),
        };
    }

    beforeAll(async () => {
        await suite.setup();

        const userRepository = new UserRepository(suite.dataSource);
        adminUser = await userRepository.findOneByOrFail({ name: 'admin' }) as unknown as UserEntity;

        const realmEntityRepository = suite.dataSource.getRepository(RealmEntity);
        const realmRepository = new RealmRepositoryAdapter(realmEntityRepository);
        const permissionRepository = new PermissionRepositoryAdapter({
            repository: suite.dataSource.getRepository(PermissionEntity),
            realmRepository: realmEntityRepository,
        });
        identityPermissionProvider = suite.container.resolve<IIdentityPermissionProvider>(
            IdentityInjectionKey.PermissionProvider,
        );

        service = new PermissionCheckerService({
            repository: permissionRepository,
            realmRepository,
            identityResolver: suite.container.resolve(IdentityInjectionKey.Resolver),
            permissionProvider: new PermissionDatabaseProvider(suite.dataSource),
            identityPermissionProvider,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('throws EntityNotFoundError for an unknown name', async () => {
        await expect(
            service.check(createNanoID(), {}, createAllowAllActor()),
        ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('throws EntityNotFoundError for an unknown realm key instead of dropping the filter', async () => {
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            builtIn: true,
        }));

        await expect(
            service.check(permission.name, {}, createAllowAllActor(), randomUUID()),
        ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('resolves for a binding-protected permission the actor owns', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            builtIn: true,
        }));

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            builtIn: true,
        }));

        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        await permissionPolicyRepository.save(permissionPolicyRepository.create({
            permissionId: permission.id,
            policyId: policy.id,
        }));

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        await userPermissionRepository.save(userPermissionRepository.create({
            userId: adminUser.id,
            userRealmId: adminUser.realmId,
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
        }));

        await expect(service.check(
            permission.id,
            {},
            requestActor({ type: IdentityType.USER, data: adminUser }),
        )).resolves.toBeUndefined();
    });

    it('throws for a binding-protected permission the actor owns when its scopes withhold global (#3604)', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            builtIn: true,
        }));

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            builtIn: true,
        }));

        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        await permissionPolicyRepository.save(permissionPolicyRepository.create({
            permissionId: permission.id,
            policyId: policy.id,
        }));

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        await userPermissionRepository.save(userPermissionRepository.create({
            userId: adminUser.id,
            userRealmId: adminUser.realmId,
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
        }));

        const identity : Identity = { type: IdentityType.USER, data: adminUser };

        await expect(service.check(permission.id, {}, requestActor(identity)))
            .resolves.toBeUndefined();

        await expect(service.check(
            permission.id,
            {
                [BuiltInPolicyType.IDENTITY]: {
                    type: IdentityType.USER,
                    id: adminUser.id,
                    realmId: adminUser.realmId,
                },
            },
            requestActor(identity, [ScopeName.OPEN_ID]),
        )).rejects.toThrow();
    });

    it('throws for a binding-protected permission the actor does not own', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            builtIn: true,
        }));

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({ name: createNanoID() }));

        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        await permissionPolicyRepository.save(permissionPolicyRepository.create({
            permissionId: permission.id,
            policyId: policy.id,
        }));

        await expect(service.check(
            permission.name,
            {},
            requestActor({ type: IdentityType.USER, data: adminUser }),
        )).rejects.toThrow();
    });

    it('gates on the resource realm from body attributes (realmMatch, own scope)', async () => {
        // own-scoped grant: a binding-protected permission granted to a fresh master-realm
        // user with realmScope=own. The checker must route body attributes.realmId into the
        // realmScope reach factor (under the realmMatch key) — a cross-realm resource realm
        // is denied, the own realm passes.
        const userRepository = new UserRepository(suite.dataSource);
        const user = await userRepository.save(userRepository.create({
            name: createNanoID(),
            email: `${createNanoID()}@example.com`,
            realmId: adminUser.realmId,
            active: true,
        })) as unknown as UserEntity;

        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            builtIn: true,
        }));

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            builtIn: true,
        }));

        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        await permissionPolicyRepository.save(permissionPolicyRepository.create({
            permissionId: permission.id,
            policyId: policy.id,
        }));

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        await userPermissionRepository.save(userPermissionRepository.create({
            userId: user.id,
            userRealmId: user.realmId,
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
            realmScope: RealmScope.OWN,
        }));

        const realmRepository = suite.dataSource.getRepository(RealmEntity);
        const otherRealm = await realmRepository.save(realmRepository.create({ name: createNanoID() }));

        const actor = requestActor({ type: IdentityType.USER, data: user });

        // cross-realm resource realm -> denied under own
        await expect(service.check(
            permission.id,
            { [BuiltInPolicyType.ATTRIBUTES]: { realmId: otherRealm.id } },
            actor,
        )).rejects.toThrow();

        // own realm -> allowed
        await expect(service.check(
            permission.id,
            { [BuiltInPolicyType.ATTRIBUTES]: { realmId: user.realmId } },
            actor,
        )).resolves.toBeUndefined();
    });

    it('safeCheck wraps failures into Result<null>', async () => {
        const result = await service.safeCheck(createNanoID(), {}, createAllowAllActor());
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(EntityNotFoundError);
        }
    });
});
