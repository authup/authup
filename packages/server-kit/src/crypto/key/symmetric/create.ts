/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { subtle } from 'uncrypto';
import { getKeyUsagesForSymmetricAlgorithm } from './key-usages.ts';
import { normalizeSymmetricKeyCreateOptions } from './normalize.ts';
import type { SymmetricKeyCreateOptionsInput } from './types.ts';

export async function createSymmetricKey(input: SymmetricKeyCreateOptionsInput) : Promise<CryptoKey> {
    const optionsNormalized = normalizeSymmetricKeyCreateOptions(input);

    return subtle.generateKey(
        optionsNormalized,
        true,
        getKeyUsagesForSymmetricAlgorithm(optionsNormalized.name),
    );
}
