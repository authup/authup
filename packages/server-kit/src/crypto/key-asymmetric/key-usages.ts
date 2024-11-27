/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CryptoAsymmetricAlgorithm } from './constants';

export function getDefaultKeyUsagesForAsymmetricAlgorithm(name: string) : KeyUsage[] | undefined {
    /**
     * @see https://nodejs.org/api/webcrypto.html#cryptokeyusages
     */
    let keyUsages : KeyUsage[] | undefined;

    switch (name) {
        case CryptoAsymmetricAlgorithm.RSA_PSS:
        case CryptoAsymmetricAlgorithm.ECDSA:
        case CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5: {
            keyUsages = [
                'sign',
                'verify',
            ];
            break;
        }
        case CryptoAsymmetricAlgorithm.ECDH: {
            keyUsages = [
                'deriveKey',
                'deriveBits',
            ];
            break;
        }
        case CryptoAsymmetricAlgorithm.RSA_OAEP: {
            keyUsages = [
                'encrypt',
                'decrypt',
            ];
        }
    }

    return keyUsages;
}
