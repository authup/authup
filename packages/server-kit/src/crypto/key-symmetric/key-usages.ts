/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CryptoSymmetricAlgorithm } from './constants';

export function getKeyUsagesForSymmetricAlgorithm(name: string) : KeyUsage[] | undefined {
    /**
     * @see https://nodejs.org/api/webcrypto.html#cryptokeyusages
     */
    if (name === CryptoSymmetricAlgorithm.HMAC) {
        return [
            'sign',
            'verify',
        ];
    }

    if (
        name === CryptoSymmetricAlgorithm.AES_CBC ||
        name === CryptoSymmetricAlgorithm.AES_GCM ||
        name === CryptoSymmetricAlgorithm.AES_CTR
    ) {
        return [
            'encrypt',
            'decrypt',
        ];
    }

    throw new SyntaxError(`Key usages can not be determined for symmetric algorithm: ${name}`);
}
