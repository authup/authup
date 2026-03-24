/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { IPolicyRepository } from '../../../../src/core/entities/policy/types.ts';
import { FakeEntityRepository } from './fake-repository.ts';

export class FakePolicyRepository extends FakeEntityRepository<Policy> implements IPolicyRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async saveWithEA(entity: Policy): Promise<Policy> {
        return this.save(entity);
    }

    async deleteFromTree(entity: Policy): Promise<void> {
        return this.remove(entity);
    }
}
