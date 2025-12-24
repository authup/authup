/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CryptoAsymmetricAlgorithm } from './constants';

/**
 * @see https://nodejs.org/api/webcrypto.html#cryptokeyusages
 */
export function getKeyUsagesForAsymmetricAlgorithm(
    name: string,
    format?: Exclude<KeyFormat, 'jwk'>,
) : KeyUsage[] {
    if (
        name === CryptoAsymmetricAlgorithm.RSA_PSS ||
        name === CryptoAsymmetricAlgorithm.ECDSA ||
        name === CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5
    ) {
        if (format === 'spki') {
            return ['verify'];
        } if (format === 'pkcs8') {
            return ['sign'];
        }

        return ['sign', 'verify'];
    }

    if (name === CryptoAsymmetricAlgorithm.ECDH) {
        if (format === 'spki') {
            return [];
        }

        return [
            'deriveKey',
            'deriveBits',
        ];
    }

    if (name === CryptoAsymmetricAlgorithm.RSA_OAEP) {
        if (format === 'spki') {
            return ['encrypt'];
        } if (format === 'pkcs8') {
            return ['decrypt'];
        }

        return ['encrypt', 'decrypt'];
    }

    throw new SyntaxError(`Key usages can not be determined for asymmetric algorithm: ${name}`);
}
