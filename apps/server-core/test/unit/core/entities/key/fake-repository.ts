/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Key } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import { EntityConflictError } from '@authup/errors';
import type { IKeyRepository } from '../../../../../src/core/entities/key/types.ts';

export class FakeKeyRepository extends FakeEntityRepository<Key> implements IKeyRepository {
    constructor() {
        // a loaded row carries every column: a realm-bound row always has a realm
        super({ defaults: { realmId: randomUUID() } });
    }

    public blobReferences = 0;

    public countBlobReferencesCalls: string[] = [];

    override async checkUniqueness(data: Partial<Key>, existing?: Key): Promise<void> {
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

    async countBlobReferences(keyId: string): Promise<number> {
        this.countBlobReferencesCalls.push(keyId);
        return this.blobReferences;
    }

    async findHighestPriority(realmId: string, use: string): Promise<number | null> {
        const priorities = this.getAll()
            .filter((entity) => entity.realmId === realmId && entity.use === use)
            .map((entity) => entity.priority);

        return priorities.length > 0 ? Math.max(...priorities) : null;
    }
}
