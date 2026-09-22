/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import type { IPathRepository } from '../../../../../src/core/entities/path/types.ts';

export type FakePathRepositoryOptions = {
    lockRows?: boolean,
};

export class FakePathRepository extends FakeEntityRepository<Path> implements IPathRepository {
    transactionCalls = 0;

    /**
     * Mirrors the adapter's private ctor option: only the instance the
     * transaction callback receives reads with a row lock, so a spec can
     * assert that the inner reads ran on the locked repository.
     */
    readonly lockRows: boolean;

    /**
     * The read methods this instance served, in call order.
     */
    reads: string[] = [];

    transactionRepository: FakePathRepository | undefined;

    constructor(options: FakePathRepositoryOptions = {}) {
        super();
        this.lockRows = options.lockRows ?? false;
    }

    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOneById(id: string): Promise<Path | null> {
        this.reads.push('findOneById');
        return super.findOneById(id);
    }

    async findOneBy(where: Record<string, any>): Promise<Path | null> {
        this.reads.push('findOneBy');
        return super.findOneBy(where);
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
        this.reads.push('findDescendants');

        const prefix = `${entity.path}/`;

        return this.store.filter((item) => item.realmId === entity.realmId &&
            item.path.startsWith(prefix));
    }

    async transaction<R>(fn: (repository: IPathRepository) => Promise<R>): Promise<R> {
        this.transactionCalls += 1;

        // the adapter hands the callback a SECOND instance, bound to the
        // transaction and locking what it reads; the store is shared by
        // reference so a write inside is visible outside, as a commit is
        const locked = new FakePathRepository({ lockRows: true });
        locked.store = this.store;
        this.transactionRepository = locked;

        return fn(locked);
    }
}
