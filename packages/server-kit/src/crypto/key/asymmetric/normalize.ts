/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CryptoAsymmetricAlgorithm } from './constants';
import type {
    AsymmetricKeyImportOptionsInput,
    AsymmetricKeyPairCreateOptions,
    AsymmetricKeyPairCreateOptionsInput,
    AsymmetricKeyPairImportOptions,
} from './types';

export function normalizeAsymmetricKeyPairCreateOptions(
    options: AsymmetricKeyPairCreateOptionsInput,
) : AsymmetricKeyPairCreateOptions {
    let optionsNormalized : AsymmetricKeyPairCreateOptions;
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

    return optionsNormalized;
}

export function normalizeAsymmetricKeyImportOptions(
    options: AsymmetricKeyImportOptionsInput,
) : AsymmetricKeyPairImportOptions {
    let optionsNormalized : AsymmetricKeyPairImportOptions;
    switch (options.name) {
        case CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5:
        case CryptoAsymmetricAlgorithm.RSA_PSS:
        case CryptoAsymmetricAlgorithm.RSA_OAEP: {
            optionsNormalized = {
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

    return optionsNormalized;
}
