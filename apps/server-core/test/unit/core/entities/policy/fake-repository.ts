/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { IPolicyRepository } from '../../../../../src/core/entities/policy/types.ts';
import { FakeEntityRepository } from '@authup/server-test-kit';

export class FakePolicyRepository extends FakeEntityRepository<Policy> implements IPolicyRepository {
    constructor() {
        // a loaded row carries every column: an unset realm is null, not absent
        super({ defaults: { realmId: null } });
    }

    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async saveWithEA(entity: Policy): Promise<Policy> {
        return this.save(entity);
    }

    async findDescendants(entity: Policy): Promise<Policy[]> {
        const output: Policy[] = [];
        const queue = [entity.id];

        while (queue.length > 0) {
            const parentId = queue.shift();
            const children = this.getAll().filter((item) => item.parentId === parentId);

            output.push(...children);
            queue.push(...children.map((child) => child.id));
        }

        return output;
    }

    transactionCalls = 0;

    /**
     * Runs as the transaction opens, before the callback's locked reads: a
     * spec commits a concurrent write here.
     */
    beforeTransaction: (() => Promise<void> | void) | undefined;

    async transaction<R>(fn: (repository: IPolicyRepository) => Promise<R>): Promise<R> {
        this.transactionCalls += 1;

        await this.beforeTransaction?.();

        return fn(this);
    }

    // the closure table cascades: deleting a node removes its whole subtree
    async deleteFromTree(entity: Policy): Promise<void> {
        const descendants = await this.findDescendants(entity);

        for (const descendant of descendants) {
            await this.remove(descendant);
        }

        return this.remove(entity);
    }
}
