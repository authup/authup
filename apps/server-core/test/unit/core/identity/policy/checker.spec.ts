/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { BuiltInPolicyType, PolicyError } from '@authup/access';
import { IdentityType } from '@authup/core-kit';
import { EntityNotFoundError } from '@authup/errors';
import { createNanoID } from '@authup/kit';
import { createAllowAllActor } from '@authup/server-test-kit';
import type { UserEntity } from '../../../../../src';
import {
    PolicyRepository,
    RealmEntity,
    UserRepository,
} from '../../../../../src';
import { PolicyCheckerService } from '../../../../../src/core';
import type { IIdentityPermissionProvider } from '../../../../../src/core';
import { IdentityInjectionKey } from '../../../../../src/app/modules/identity/index.ts';
import { PolicyRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/policy/repository.ts';
import { RealmRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/realm/repository.ts';
import { createTestApplication } from '../../../../app';

describe('core/identity/policy/checker', () => {
    const suite = createTestApplication();

    let service: PolicyCheckerService;
    let adminUser: UserEntity;

    beforeAll(async () => {
        await suite.setup();

        const userRepository = new UserRepository(suite.dataSource);
        adminUser = await userRepository.findOneByOrFail({ name: 'admin' }) as unknown as UserEntity;

        const realmEntityRepository = suite.dataSource.getRepository(RealmEntity);
        const realmRepository = new RealmRepositoryAdapter(realmEntityRepository);
        const policyRepository = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(suite.dataSource),
            realmRepository: realmEntityRepository,
        });
        const identityPermissionProvider = (suite as any).container.resolve(
            IdentityInjectionKey.PermissionProvider,
        ) as IIdentityPermissionProvider;

        service = new PolicyCheckerService({
            repository: policyRepository,
            realmRepository,
            identityPermissionProvider,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('throws EntityNotFoundError for an unknown policy', async () => {
        await expect(
            service.check(createNanoID(), {}, createAllowAllActor()),
        ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('resolves when an identity policy passes for the actor', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.IDENTITY,
            name: BuiltInPolicyType.IDENTITY,
            built_in: true,
        }));

        await expect(service.check(
            policy.id,
            {},
            {
                permissionEvaluator: createAllowAllActor().permissionEvaluator,
                identity: { type: IdentityType.USER, data: adminUser as any },
            },
        )).resolves.toBeUndefined();
    });

    it('rejects when the policy evaluation does not succeed', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = await policyRepository.save(policyRepository.create({
            type: BuiltInPolicyType.IDENTITY,
            name: `${BuiltInPolicyType.IDENTITY}-denial`,
            built_in: true,
        }));

        await expect(service.check(
            policy.id,
            {},
            createAllowAllActor(),
        )).rejects.toBeInstanceOf(PolicyError);
    });

    it('safeCheck wraps failures into Result<null>', async () => {
        const result = await service.safeCheck(createNanoID(), {}, createAllowAllActor());
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(EntityNotFoundError);
        }
    });
});
