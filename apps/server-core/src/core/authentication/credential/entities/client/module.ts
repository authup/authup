/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { AuthupError } from '@authup/errors';
import { createNanoID } from '@authup/kit';
import { compare, hash } from '@authup/server-kit';
import { type Client, ClientAuthMethod } from '@authup/core-kit';
import { isRealmCipherBlob, isRealmCipherBlobError } from '../../../../key/index.ts';
import type { IRealmCipher } from '../../../../key/index.ts';
import type { ICredentialService } from '../../types.ts';

export type ClientCredentialsServiceContext = {
    /**
     * Encrypts and decrypts secrets stored in encrypted mode under the
     * client realm's enc key. Absent only in wiring that never meets such a
     * client (the default provisioning source).
     */
    cipher?: IRealmCipher,
};

export type ClientSecretTarget = Pick<Partial<Client>, 'secretHashed' | 'secretEncrypted' | 'realmId'>;

export class ClientCredentialsService implements ICredentialService<Client> {
    protected cipher?: IRealmCipher;

    constructor(ctx: ClientCredentialsServiceContext = {}) {
        this.cipher = ctx.cipher;
    }

    async verify(input: string, entity: Client): Promise<boolean> {
        if (!entity.secret || entity.authMethod !== ClientAuthMethod.SECRET) {
            return false;
        }

        if (entity.secretHashed) {
            return compare(input, entity.secret);
        }

        // A value under the encrypted flag that is not a blob is a legacy
        // plaintext the flag never protected; it compares as plain.
        if (entity.secretEncrypted && isRealmCipherBlob(entity.secret)) {
            if (!this.cipher) {
                return false;
            }

            try {
                return constantTimeEqual(input, await this.cipher.decrypt(entity.secret, entity.realmId));
            } catch (e) {
                // an unknown, disabled or foreign key fails the credential
                // closed; anything else is infrastructure and surfaces.
                if (isRealmCipherBlobError(e)) {
                    return false;
                }

                throw e;
            }
        }

        return constantTimeEqual(input, entity.secret);
    }

    /**
     * The input is always a plaintext: the caller decides the storage mode
     * and this method applies it. There is deliberately no "is it already a
     * hash" sniff, so a plaintext shaped like a bcrypt hash is protected
     * like any other and never stored raw.
     */
    async protect(input: string, entity: ClientSecretTarget): Promise<string> {
        if (entity.secretHashed) {
            return hash(input);
        }

        if (entity.secretEncrypted) {
            if (!this.cipher) {
                throw new AuthupError('Encrypted client secrets need the realm cipher, which is not wired here.');
            }

            if (!entity.realmId) {
                throw new AuthupError('An encrypted client secret needs the client realm.');
            }

            return this.cipher.encrypt(input, entity.realmId);
        }

        return input;
    }

    generateSecret() {
        return createNanoID(64);
    }
}

/**
 * Compares the digests rather than the values: `timingSafeEqual` needs
 * equal-length inputs, and a length check before it would leak the secret's
 * length to a wrong-length guess.
 */
function constantTimeEqual(a: string, b: string): boolean {
    return timingSafeEqual(
        createHash('sha256').update(a).digest(),
        createHash('sha256').update(b).digest(),
    );
}
