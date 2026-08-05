/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IScopeRepository } from '../../../../../src/core/entities/scope/types.ts';

export class FakeScopeRepository extends FakeEntityRepository<Scope> implements IScopeRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }
}
