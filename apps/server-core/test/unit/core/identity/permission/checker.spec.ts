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
import { BuiltInPolicyType, RealmScope } from '@authup/access';
import { IdentityType } from '@authup/core-kit';
import { EntityNotFoundError } from '@authup/errors';
import { createNanoID } from '@authup/kit';
import { createAllowAllActor } from '@authup/server-test-kit';
import type { UserEntity } from '../../../../../src';
import {
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyRepository,
    RealmEntity,
    UserPermissionEntity,
    UserRepository,
} from '../../../../../src';
import { PermissionCheckerService } from '../../../../../src/core';
import type { IIdentityPermissionProvider } from '../../../../../src/core';
import { IdentityInjectionKey } from '../../../../../src/app/modules/identity/index.ts';
import { PermissionDatabaseProvider } from '../../../../../src/app/modules/database/repositories/permission-provider/module.ts';
import { PermissionRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/permission/repository.ts';
import { RealmRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/realm/repository.ts';
import { createTestApplication } from '../../../../app';

describe('core/identity/permission/checker', () => {
    const suite = createTestApplication();

    let service: PermissionCheckerService;
    let adminUser: UserEntity;

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
        const identityPermissionProvider = (suite as any).container.resolve(
            IdentityInjectionKey.PermissionProvider,
        ) as IIdentityPermissionProvider;

        service = new PermissionCheckerService({
            repository: permissionRepository,
            realmRepository,
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
            built_in: true,
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
            built_in: true,
        }));

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            built_in: true,
        }));

        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        await permissionPolicyRepository.save(permissionPolicyRepository.create({
            permission_id: permission.id,
            policy_id: policy.id,
        }));

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        await userPermissionRepository.save(userPermissionRepository.create({
            user_id: adminUser.id,
            user_realm_id: adminUser.realm_id,
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
        }));

        await expect(service.check(
            permission.id,
            {},
            {
                permissionEvaluator: createAllowAllActor().permissionEvaluator,
                identity: { type: IdentityType.USER, data: adminUser as any },
            },
        )).resolves.toBeUndefined();
    });

    it('throws for a binding-protected permission the actor does not own', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            built_in: true,
        }));

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({ name: createNanoID() }));

        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        await permissionPolicyRepository.save(permissionPolicyRepository.create({
            permission_id: permission.id,
            policy_id: policy.id,
        }));

        await expect(service.check(
            permission.name,
            {},
            {
                permissionEvaluator: createAllowAllActor().permissionEvaluator,
                identity: { type: IdentityType.USER, data: adminUser as any },
            },
        )).rejects.toThrow();
    });

    it('gates on the resource realm from body attributes (realmMatch, own scope)', async () => {
        // own-scoped grant: a binding-protected permission granted to a fresh master-realm
        // user with realm_scope=own. The checker must route body attributes.realm_id into the
        // realm_scope reach factor (under the realmMatch key) — a cross-realm resource realm
        // is denied, the own realm passes.
        const userRepository = new UserRepository(suite.dataSource);
        const user = await userRepository.save(userRepository.create({
            name: createNanoID(),
            email: `${createNanoID()}@example.com`,
            realm_id: adminUser.realm_id,
            active: true,
        })) as unknown as UserEntity;

        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            built_in: true,
        }));

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            built_in: true,
        }));

        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        await permissionPolicyRepository.save(permissionPolicyRepository.create({
            permission_id: permission.id,
            policy_id: policy.id,
        }));

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        await userPermissionRepository.save(userPermissionRepository.create({
            user_id: user.id,
            user_realm_id: user.realm_id,
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
            realm_scope: RealmScope.OWN,
        }));

        const realmRepository = suite.dataSource.getRepository(RealmEntity);
        const otherRealm = await realmRepository.save(realmRepository.create({ name: createNanoID() }));

        const actor = {
            permissionEvaluator: createAllowAllActor().permissionEvaluator,
            identity: { type: IdentityType.USER, data: user as any },
        };

        // cross-realm resource realm -> denied under own
        await expect(service.check(
            permission.id,
            { [BuiltInPolicyType.ATTRIBUTES]: { realm_id: otherRealm.id } },
            actor,
        )).rejects.toThrow();

        // own realm -> allowed
        await expect(service.check(
            permission.id,
            { [BuiltInPolicyType.ATTRIBUTES]: { realm_id: user.realm_id } },
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
