/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import type { JWKUse } from '@authup/specs';
import type { IRealmProvisioner } from '../provisioning/types.ts';

export interface IKeyProvisioner extends IRealmProvisioner {
    /**
     * Ensure the realm holds at least one sig and one enc key row.
     * Idempotent; never throws (provisioning must not fail realm creation
     * or startup).
     *
     * @param realm
     */
    ensureForRealm(realm: { id: string }): Promise<void>;
}

export interface IKeyStore {
    /**
     * Resolve the realm's highest-priority ACTIVE key for the given use,
     * with usable (unwrapped) material. Mints one iff ZERO rows exist for
     * (realm, use) — the self-healing zero-config backstop (provisioning
     * mints eagerly). Rows existing but none active fails loud: an admin
     * who disabled every key meant it.
     *
     * @param realmId
     * @param use
     */
    resolveOrCreate(realmId: string, use: `${JWKUse}`) : Promise<Key>;

    /**
     * Resolve a key by explicit id with usable (unwrapped) material.
     * Read-only; status enforcement is the consumer's concern.
     *
     * @param id
     */
    resolveById(id: string) : Promise<Key | null>;
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
     * @param plain
     * @param realmId
     */
    encrypt(plain: string, realmId: string) : Promise<string>;

    /**
     * Decrypt a blob via the key id it carries. The referenced key must
     * belong to the given realm — the binding assert is mandatory, so a
     * foreign realm's blob can never decrypt.
     *
     * @param blob
     * @param realmId
     */
    decrypt(blob: string, realmId: string) : Promise<string>;
}
