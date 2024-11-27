/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CryptoSymmetricAlgorithm } from './constants';
import { getKeyUsagesForSymmetricAlgorithm } from './key-usages';
import type { KeyOptions, KeyOptionsInput } from './types';

export async function createKey(input?: KeyOptionsInput) : Promise<CryptoKey> {
    let optionsNormalized : KeyOptions;
    if (input) {
        switch (input.name) {
            case CryptoSymmetricAlgorithm.HMAC: {
                optionsNormalized = {
                    hash: 'SHA-256',
                    ...input,
                };
                break;
            }
            default: {
                optionsNormalized = {
                    length: 256,
                    ...input,
                };
            }
        }
    } else {
        optionsNormalized = {
            name: CryptoSymmetricAlgorithm.HMAC,
            hash: 'SHA-256',
        };
    }

    return crypto.subtle.generateKey(
        optionsNormalized,
        true,
        getKeyUsagesForSymmetricAlgorithm(optionsNormalized.name),
    );
}
