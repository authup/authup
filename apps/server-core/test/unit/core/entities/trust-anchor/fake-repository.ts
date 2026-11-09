/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { TrustAnchor } from '@authup/core-kit';
import { EntityConflictError } from '@authup/errors';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { ITrustAnchorRepository } from '../../../../../src/core/entities/trust-anchor/types.ts';

export class FakeTrustAnchorRepository extends FakeEntityRepository<TrustAnchor> implements ITrustAnchorRepository {
    constructor() {
        // a loaded row carries every column: a realm-bound row always has a realm
        super({ defaults: { realmId: randomUUID() } });
    }

    /**
     * Runs as the transaction opens, before the callback's locked read: a
     * spec commits a concurrent write here.
     */
    beforeTransaction: (() => Promise<void> | void) | undefined;

    async transaction<R>(fn: (repository: ITrustAnchorRepository) => Promise<R>): Promise<R> {
        await this.beforeTransaction?.();

        return fn(this);
    }

    /**
     * A copy, as a database read is: merging onto it must not reach the row.
     */
    override async findOneBy(where: Record<string, any>): Promise<TrustAnchor | null> {
        const row = await super.findOneBy(where);

        return row ? { ...row } : null;
    }

    override async checkUniqueness(data: Partial<TrustAnchor>, existing?: TrustAnchor): Promise<void> {
        // A column the input does not define keeps its stored value, like
        // the adapter's check.
        const name = data.name !== undefined ? data.name : existing?.name;
        const realmId = data.realmId !== undefined ? data.realmId : existing?.realmId;
        const conflict = this.getAll().find(
            (entity) => entity.name === name &&
                entity.realmId === realmId &&
                (!existing || entity.id !== existing.id),
        );

        if (conflict) {
            throw new EntityConflictError();
        }
    }
}
