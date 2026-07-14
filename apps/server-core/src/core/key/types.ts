/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import type { JWKUse } from '@authup/specs';

export interface IKeyRepository {
    /**
     * Find the realm's highest-priority key for the given use,
     * creating one when none exists (sig → RSA pair, enc → symmetric
     * oct material).
     *
     * @param realmId
     * @param use
     */
    findByRealmId(realmId: string, use: `${JWKUse}`) : Promise<Key | null>;

    /**
     * Find a key by explicit id.
     *
     * @param id
     */
    findById(id: string) : Promise<Key | null>;
}

/**
 * Realm-scoped at-rest encryption over the key store's enc keys.
 * Blobs are self-describing (v1.&lt;key_id&gt;.&lt;payload&gt;), so decryption
 * resolves its key by id — concurrent key creation and future key
 * rotation never orphan a blob.
 */
export interface IRealmCipher {
    /**
     * Encrypt under the realm's current enc key (created on first use).
     *
     * @param realmId
     * @param plain
     */
    encrypt(realmId: string, plain: string) : Promise<string>;

    /**
     * Decrypt a blob via the key id it carries. When a realmId is
     * supplied, the referenced key must belong to that realm.
     *
     * @param blob
     * @param realmId
     */
    decrypt(blob: string, realmId?: string) : Promise<string>;
}
