/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import { EntityConflictError } from '@authup/errors';
import type { IKeyRepository } from '../../../../../src/core/entities/key/types.ts';

export class FakeKeyRepository extends FakeEntityRepository<Key> implements IKeyRepository {
    public blobReferences = 0;

    public countBlobReferencesCalls: string[] = [];

    override async checkUniqueness(data: Partial<Key>, existing?: Key): Promise<void> {
        const conflict = this.getAll().find(
            (entity) => entity.name === data.name &&
                entity.realm_id === data.realm_id &&
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
            .filter((entity) => entity.realm_id === realmId && entity.use === use)
            .map((entity) => entity.priority);

        return priorities.length > 0 ? Math.max(...priorities) : null;
    }
}
