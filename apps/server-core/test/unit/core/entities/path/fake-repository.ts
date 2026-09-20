/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IPathRepository } from '../../../../../src/core/entities/path/types.ts';

export class FakePathRepository extends FakeEntityRepository<Path> implements IPathRepository {
    transactionCalls = 0;

    async checkUniqueness(): Promise<void> {
        // no-op
    }

    /**
     * A folder is addressed by its FULL path, never by the single segment
     * `name`, so the name lookup the base class offers is re-pointed here
     * exactly as the repository adapter re-points it onto `path.path`.
     */
    async findOneByName(name: string, realm?: string): Promise<Path | null> {
        return this.findOneBy(realm ? {
            path: name,
            realmId: realm,
        } : { path: name });
    }

    async findDescendants(entity: Path): Promise<Path[]> {
        const prefix = `${entity.path}/`;

        return this.store.filter((item) => item.realmId === entity.realmId &&
            item.path.startsWith(prefix));
    }

    async transaction<R>(fn: (repository: IPathRepository) => Promise<R>): Promise<R> {
        this.transactionCalls += 1;
        return fn(this);
    }
}
