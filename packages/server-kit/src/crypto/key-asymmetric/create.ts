/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CryptoAsymmetricAlgorithm } from './constants';
import { getDefaultKeyUsagesForAsymmetricAlgorithm } from './key-usages';
import type { KeyPairCreateOptions, KeyPairCreateOptionsInput } from './types';

export async function createKeyPair(options?: KeyPairCreateOptionsInput) : Promise<CryptoKeyPair> {
    let optionsNormalized : KeyPairCreateOptions;
    if (options) {
        switch (options.name) {
            case CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5:
            case CryptoAsymmetricAlgorithm.RSA_PSS:
            case CryptoAsymmetricAlgorithm.RSA_OAEP: {
                optionsNormalized = {
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: 'SHA-256',
                    ...options,
                };
                break;
            }
            case CryptoAsymmetricAlgorithm.ECDSA:
            case CryptoAsymmetricAlgorithm.ECDH: {
                optionsNormalized = {
                    namedCurve: 'P-256',
                    ...options,
                };
            }
        }
    } else {
        optionsNormalized = {
            name: CryptoAsymmetricAlgorithm.RSA_OAEP,
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: 'SHA-256',
        };
    }

    return crypto.subtle.generateKey(
        optionsNormalized,
        true,
        getDefaultKeyUsagesForAsymmetricAlgorithm(optionsNormalized.name),
    );
}
