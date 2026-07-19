/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import { EntityConflictError } from '@authup/errors';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { ITrustAnchorRepository } from '../../../../../src/core/entities/trust-anchor/types.ts';

export class FakeTrustAnchorRepository extends FakeEntityRepository<TrustAnchor> implements ITrustAnchorRepository {
    override async checkUniqueness(data: Partial<TrustAnchor>, existing?: TrustAnchor): Promise<void> {
        const conflict = this.getAll().find(
            (entity) => entity.name === data.name &&
                entity.realmId === data.realmId &&
                (!existing || entity.id !== existing.id),
        );

        if (conflict) {
            throw new EntityConflictError();
        }
    }
}
