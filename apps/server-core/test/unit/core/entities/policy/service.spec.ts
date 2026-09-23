/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import type { Policy } from '@authup/core-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { PolicyService } from '../../../../../src/core/entities/policy/service.ts';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { FakePolicyRepository } from './fake-repository.ts';

describe('core/entities/policy/service', () => {
    let repository: FakePolicyRepository;
    let service: PolicyService;

    beforeEach(() => {
        repository = new FakePolicyRepository();
        service = new PolicyService({ repository, realmRepository: new FakeRealmRepository() });
    });

    function seed(name: string): Policy {
        return repository.seed({
            id: randomUUID(),
            name,
            type: BuiltInPolicyType.COMPOSITE,
            builtIn: false,
            invert: false,
            realmId: null,
        } as Policy);
    }

    describe('update with a restricted grant (#3654)', () => {
        function createRestrictedActor() {
            const permissionEvaluator = new FakePermissionEvaluator();
            permissionEvaluator.setBehavior((call) => {
                if (call.method !== 'evaluate' || call.ctx.name !== PermissionName.PERMISSION_UPDATE) {
                    return;
                }

                const attributes = call.ctx.data?.get(BuiltInPolicyType.ATTRIBUTES) as Partial<Policy>;
                if (!attributes?.name?.startsWith('reach-')) {
                    throw PermissionError.denied('test');
                }
            });

            return { permissionEvaluator };
        }

        it('should refuse moving an unreachable row into reach', async () => {
            const entity = seed('outside');

            await expect(
                service.update(entity.id, { name: 'reach-inside' }, createRestrictedActor()),
            ).rejects.toThrow(PermissionError);
            expect((await repository.findOneById(entity.id))?.name).toBe('outside');
        });

        it('should allow updating a row that stays in reach', async () => {
            const entity = seed('reach-a');

            const result = await service.update(entity.id, { name: 'reach-b' }, createRestrictedActor());
            expect(result.name).toBe('reach-b');
        });

        it('should refuse moving a reachable row out of reach', async () => {
            const entity = seed('reach-a');

            await expect(
                service.update(entity.id, { name: 'outside' }, createRestrictedActor()),
            ).rejects.toThrow(PermissionError);
            expect((await repository.findOneById(entity.id))?.name).toBe('reach-a');
        });
    });
});
