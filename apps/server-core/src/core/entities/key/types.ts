/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';

export interface IKeyRepository extends IEntityRepository<Key> {
    checkUniqueness(data: Partial<Key>, existing?: Key): Promise<void>;

    /**
     * Count cipher blobs (v1.<key_id>.…) still referencing the key —
     * today the MFA authenticator seeds; plan-070 consumers extend this.
     * Deleting a referenced enc key crypto-shreds those blobs.
     *
     * @param keyId
     */
    countBlobReferences(keyId: string): Promise<number>;

    /**
     * Highest priority currently assigned for (realm, use) — create
     * defaults to max + 1 so "generate" doubles as "rotate".
     */
    findHighestPriority(realmId: string, use: string): Promise<number | null>;
}

export type KeyDeleteOptions = {
    /**
     * Delete an enc key even while cipher blobs still reference it
     * (crypto-shreds them).
     */
    force?: boolean,
};

export interface IKeyService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Key>>;
    getOne(idOrName: string, actor: ActorContext, realmId?: string): Promise<Key>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Key>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext, realmId?: string): Promise<Key>;
    delete(id: string, actor: ActorContext, options?: KeyDeleteOptions): Promise<Key>;
}
