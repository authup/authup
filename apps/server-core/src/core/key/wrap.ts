/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { ISymmetricCipher } from '@authup/server-kit';
import { WRAPPED_KEY_MATERIAL_PREFIX } from './constants.ts';

export function isWrappedKeyMaterial(value: string) : boolean {
    return value.startsWith(WRAPPED_KEY_MATERIAL_PREFIX);
}

export async function wrapKeyMaterial(
    cipher: ISymmetricCipher,
    value: string,
) : Promise<string> {
    return `${WRAPPED_KEY_MATERIAL_PREFIX}${await cipher.encrypt(value)}`;
}

export async function unwrapKeyMaterial(
    cipher: ISymmetricCipher | null | undefined,
    value: string,
) : Promise<string> {
    if (!isWrappedKeyMaterial(value)) {
        return value;
    }

    if (!cipher) {
        throw new AuthupError(
            'The key store holds wrapped key material, ' +
            'but no secretsEncryptionKey (SECRETS_ENCRYPTION_KEY) is configured.',
        );
    }

    return cipher.decrypt(value.substring(WRAPPED_KEY_MATERIAL_PREFIX.length));
}
