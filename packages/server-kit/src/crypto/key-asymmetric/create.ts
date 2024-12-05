/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getKeyUsagesForAsymmetricAlgorithm } from './key-usages';
import { normalizeAsymmetricKeyPairCreateOptions } from './normalize';
import type { AsymmetricKeyPairCreateOptionsInput } from './types';

export async function createAsymmetricKeyPair(options: AsymmetricKeyPairCreateOptionsInput) : Promise<CryptoKeyPair> {
    const optionsNormalized = normalizeAsymmetricKeyPairCreateOptions(options);
    return crypto.subtle.generateKey(
        optionsNormalized,
        true,
        getKeyUsagesForAsymmetricAlgorithm(optionsNormalized.name),
    );
}
