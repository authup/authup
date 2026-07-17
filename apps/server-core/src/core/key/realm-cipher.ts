/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { KeyStatus } from '@authup/core-kit';
import type { ISymmetricCipher } from '@authup/server-kit';
import { SymmetricCipher } from '@authup/server-kit';
import { JWKUse } from '@authup/specs';
import { REALM_CIPHER_BLOB_VERSION } from './constants.ts';
import { RealmCipherBlobError } from './error.ts';
import type { IKeyStore, IRealmCipher } from './types.ts';

export type RealmCipherContext = {
    keyStore: IKeyStore,
};

export class RealmCipher implements IRealmCipher {
    protected keyStore : IKeyStore;

    /**
     * Imported ciphers by key id — key MATERIAL is immutable, so entries
     * never invalidate. Status and realm binding are deliberately NOT
     * cached: decrypt re-resolves the key row every call so disabling a
     * key acts as an immediate, reversible kill switch.
     */
    protected ciphers : Map<string, ISymmetricCipher>;

    constructor(ctx: RealmCipherContext) {
        this.keyStore = ctx.keyStore;
        this.ciphers = new Map();
    }

    async encrypt(plain: string, realmId: string) : Promise<string> {
        const key = await this.keyStore.resolveOrCreate(realmId, JWKUse.ENCRYPTION);
        if (!key.decryptionKey) {
            throw new AuthupError(`An encryption key could not be resolved for realm ${realmId}.`);
        }

        const cipher = this.resolveCipher(key.id, key.decryptionKey);

        return [
            REALM_CIPHER_BLOB_VERSION,
            key.id,
            await cipher.encrypt(plain),
        ].join('.');
    }

    async decrypt(blob: string, realmId: string) : Promise<string> {
        const parts = blob.split('.');
        if (parts.length !== 3 || parts[0] !== REALM_CIPHER_BLOB_VERSION) {
            throw new RealmCipherBlobError('The cipher blob is malformed.');
        }

        const [, keyId, payload] = parts;

        const key = await this.keyStore.resolveById(keyId);
        if (
            !key ||
            key.use !== JWKUse.ENCRYPTION ||
            !key.decryptionKey
        ) {
            throw new RealmCipherBlobError(`The cipher blob references an unknown encryption key (${keyId}).`);
        }

        if (key.status === KeyStatus.DISABLED) {
            throw new RealmCipherBlobError(`The cipher blob references a disabled encryption key (${keyId}).`);
        }

        if (key.realmId !== realmId) {
            throw new RealmCipherBlobError(`The cipher blob references a foreign realm's encryption key (${keyId}).`);
        }

        const cipher = this.resolveCipher(key.id, key.decryptionKey);

        try {
            return await cipher.decrypt(payload);
        } catch {
            // failed GCM authentication / corrupt payload — blob semantics,
            // not infrastructure.
            throw new RealmCipherBlobError(`The cipher blob could not be decrypted (${keyId}).`);
        }
    }

    protected resolveCipher(
        keyId: string,
        material: string,
    ) : ISymmetricCipher {
        let cipher = this.ciphers.get(keyId);
        if (!cipher) {
            cipher = new SymmetricCipher(material);
            this.ciphers.set(keyId, cipher);
        }

        return cipher;
    }
}
