/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { createNanoID } from '@authup/kit';
import { compare, hash } from '@authup/server-kit';
import { type Client, ClientAuthMethod } from '@authup/core-kit';
import type { ICredentialService } from '../../types.ts';

export type ClientSecretTarget = Pick<Client, 'secretHashed' | 'secretEncrypted'>;

export class ClientCredentialsService implements ICredentialService<Client> {
    async verify(input: string, entity: Client): Promise<boolean> {
        if (!entity.secret || entity.authMethod !== ClientAuthMethod.SECRET) {
            return false;
        }

        if (entity.secretHashed) {
            return compare(input, entity.secret);
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
