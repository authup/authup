/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SymmetricAlgorithm } from './constants';

export function getKeyUsagesForSymmetricAlgorithm(name: string) : KeyUsage[] {
    /**
     * @see https://nodejs.org/api/webcrypto.html#cryptokeyusages
     */
    if (name === SymmetricAlgorithm.HMAC) {
        return [
            'sign',
            'verify',
        ];
    }

    if (
        name === SymmetricAlgorithm.AES_CBC ||
        name === SymmetricAlgorithm.AES_GCM ||
        name === SymmetricAlgorithm.AES_CTR
    ) {
        return [
            'encrypt',
            'decrypt',
        ];
    }

    throw new SyntaxError(`Key usages can not be determined for symmetric algorithm: ${name}`);
}
