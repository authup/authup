/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import type { Key } from '@authup/core-kit';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

// Mirrors `KeyValidator` mounts in @authup/core-kit. Without material
// (decryptionKey) the server GENERATES a key; with it, the material is
// IMPORTED (sig: pkcs8 + spki, base64 or PEM; enc: 32 base64 bytes).
// Responses never carry decryptionKey.
export type KeyCreatePayload = Pick<Key, 'use'> &
    Partial<Pick<Key, 'name' | 'priority' | 'status' | 'signatureAlgorithm' | 'realmId' | 'decryptionKey' | 'encryptionKey' | 'certificate'>>;
export type KeyUpdatePayload = Partial<Pick<Key, 'name' | 'priority' | 'status'>>;

export type KeyDeleteOptions = {
    /**
     * Delete an enc key even while encrypted secrets still reference it
     * (crypto-shreds them). Without it the server rejects with 409 +
     * `references` count.
     */
    force?: boolean,
};

export interface IKeyAPI {
    getMany(data?: BuildInput<Key>): Promise<EntityCollectionResponse<Key>>;

    getOne(id: Key['id'], record?: BuildInput<Key>): Promise<EntityRecordResponse<Key>>;

    create(data: KeyCreatePayload): Promise<EntityRecordResponse<Key>>;

    update(id: Key['id'], data: KeyUpdatePayload): Promise<EntityRecordResponse<Key>>;

    delete(id: Key['id'], options?: KeyDeleteOptions): Promise<EntityRecordResponse<Key>>;
}
