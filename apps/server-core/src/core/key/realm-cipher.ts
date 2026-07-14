/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { ISymmetricCipher } from '@authup/server-kit';
import { SymmetricCipher } from '@authup/server-kit';
import { JWKUse } from '@authup/specs';
import { REALM_CIPHER_BLOB_VERSION } from './constants.ts';
import { RealmCipherBlobError } from './error.ts';
import type { IKeyRepository, IRealmCipher } from './types.ts';

export type RealmCipherContext = {
    keyRepository: IKeyRepository,
};

type CipherCacheEntry = {
    realmId: string,
    cipher: ISymmetricCipher,
};

export class RealmCipher implements IRealmCipher {
    protected keyRepository : IKeyRepository;

    /**
     * Imported ciphers by key id — key material is immutable, so
     * entries never invalidate.
     */
    protected ciphers : Map<string, CipherCacheEntry>;

    constructor(ctx: RealmCipherContext) {
        this.keyRepository = ctx.keyRepository;
        this.ciphers = new Map();
    }

    async encrypt(plain: string, realmId: string) : Promise<string> {
        const key = await this.keyRepository.findByRealmId(realmId, JWKUse.ENCRYPTION);
        if (!key || !key.decryption_key) {
            throw new AuthupError(`An encryption key could not be resolved for realm ${realmId}.`);
        }

        const entry = this.resolveCipher(key.id, key.realm_id, key.decryption_key);

        return [
            REALM_CIPHER_BLOB_VERSION,
            key.id,
            await entry.cipher.encrypt(plain),
        ].join('.');
    }

    async decrypt(blob: string, realmId: string) : Promise<string> {
        const parts = blob.split('.');
        if (parts.length !== 3 || parts[0] !== REALM_CIPHER_BLOB_VERSION) {
            throw new RealmCipherBlobError('The cipher blob is malformed.');
        }

        const [, keyId, payload] = parts;

        let entry = this.ciphers.get(keyId);
        if (!entry) {
            const key = await this.keyRepository.findById(keyId);
            if (
                !key ||
                key.use !== JWKUse.ENCRYPTION ||
                !key.decryption_key
            ) {
                throw new RealmCipherBlobError(`The cipher blob references an unknown encryption key (${keyId}).`);
            }

            entry = this.resolveCipher(key.id, key.realm_id, key.decryption_key);
        }

        if (entry.realmId !== realmId) {
            throw new RealmCipherBlobError(`The cipher blob references a foreign realm's encryption key (${keyId}).`);
        }

        try {
            return await entry.cipher.decrypt(payload);
        } catch {
            // failed GCM authentication / corrupt payload — blob semantics,
            // not infrastructure.
            throw new RealmCipherBlobError(`The cipher blob could not be decrypted (${keyId}).`);
        }
    }

    protected resolveCipher(
        keyId: string,
        realmId: string,
        material: string,
    ) : CipherCacheEntry {
        let entry = this.ciphers.get(keyId);
        if (!entry) {
            entry = {
                realmId,
                cipher: new SymmetricCipher(material),
            };
            this.ciphers.set(keyId, entry);
        }

        return entry;
    }
}
