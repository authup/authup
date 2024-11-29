/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SymmetricAlgorithm } from './constants';

export type AESKeyOptions = AesKeyGenParams & {
    name: SymmetricAlgorithm.AES_CBC |
    SymmetricAlgorithm.AES_CTR |
    SymmetricAlgorithm.AES_GCM;
};

export type AESKeyOptionsInput = Partial<AesKeyGenParams> & {
    name: SymmetricAlgorithm.AES_CBC |
    SymmetricAlgorithm.AES_CTR |
    SymmetricAlgorithm.AES_GCM;
};

export type HMACKeyOptions = HmacKeyGenParams & {
    name: SymmetricAlgorithm.HMAC;
};

export type HMACKeyOptionsInput = Partial<HmacKeyGenParams> & {
    name: SymmetricAlgorithm.HMAC;
};

export type SymmetricKeyOptions = AESKeyOptions | HMACKeyOptions;
export type SymmetricKeyCreateOptionsInput = AESKeyOptionsInput | HMACKeyOptionsInput;

// -----------------------------------------------

export type AESKeyImportOptions = AesKeyAlgorithm & {
    name: SymmetricAlgorithm.AES_CBC |
    SymmetricAlgorithm.AES_CTR |
    SymmetricAlgorithm.AES_GCM;
};

export type HMACKeyImportOptions = HmacImportParams & {
    name: SymmetricAlgorithm.HMAC;
};
export type HMACKeyImportOptionsInput = Partial<HmacImportParams> & {
    name: SymmetricAlgorithm.HMAC;
};

export type SymmetricKeyImportOptions = AESKeyImportOptions | HMACKeyImportOptions;
export type SymmetricKeyImportOptionsInput = AESKeyImportOptions | HMACKeyImportOptionsInput;
