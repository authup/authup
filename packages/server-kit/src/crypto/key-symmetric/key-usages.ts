/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CryptoSymmetricAlgorithm } from './constants';

export function getDefaultKeyUsagesForSymmetricAlgorithm(name: string) : KeyUsage[] | undefined {
    /**
     * @see https://nodejs.org/api/webcrypto.html#cryptokeyusages
     */
    let keyUsages : KeyUsage[] | undefined;
    switch (name) {
        case CryptoSymmetricAlgorithm.HMAC: {
            keyUsages = [
                'sign',
                'verify',
            ];
            break;
        }
        case CryptoSymmetricAlgorithm.AES_CBC:
        case CryptoSymmetricAlgorithm.AES_GCM:
        case CryptoSymmetricAlgorithm.AES_CTR: {
            keyUsages = [
                'encrypt',
                'decrypt',
            ];
            break;
        }
    }

    return keyUsages;
}
