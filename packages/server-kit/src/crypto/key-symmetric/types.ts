/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CryptoSymmetricAlgorithm } from './constants';

export type AESKeyOptions = AesKeyGenParams & {
    name: CryptoSymmetricAlgorithm.AES_CBC |
    CryptoSymmetricAlgorithm.AES_CTR |
    CryptoSymmetricAlgorithm.AES_GCM;
};

export type AESKeyOptionsInput = Partial<AesKeyGenParams> & {
    name: CryptoSymmetricAlgorithm.AES_CBC |
    CryptoSymmetricAlgorithm.AES_CTR |
    CryptoSymmetricAlgorithm.AES_GCM;
};

export type HMACKeyOptions = HmacKeyGenParams & {
    name: CryptoSymmetricAlgorithm.HMAC;
};

export type HMACKeyOptionsInput = Partial<HmacKeyGenParams> & {
    name: CryptoSymmetricAlgorithm.HMAC;
};

export type KeyOptions = AESKeyOptions | HMACKeyOptions;
export type KeyOptionsInput = AESKeyOptionsInput | HMACKeyOptionsInput;

// -----------------------------------------------

export type AESKeyImportOptions = {
    name: CryptoSymmetricAlgorithm.AES_CBC |
    CryptoSymmetricAlgorithm.AES_CTR |
    CryptoSymmetricAlgorithm.AES_GCM;
};

export type HMACKeyImportOptions = HmacImportParams & {
    name: CryptoSymmetricAlgorithm.HMAC;
};
export type HMACKeyImportOptionsInput = Partial<HmacImportParams> & {
    name: CryptoSymmetricAlgorithm.HMAC;
};

export type KeyImportOptions = AESKeyImportOptions | HMACKeyImportOptions;
export type KeyImportOptionsInput = AESKeyImportOptions | HMACKeyImportOptionsInput;
