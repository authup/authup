/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SymmetricAlgorithm } from './constants';

export type AESKeyCreateOptions = AesKeyGenParams & {
    name: `${SymmetricAlgorithm.AES_CBC}` |
        `${SymmetricAlgorithm.AES_CTR}` |
        `${SymmetricAlgorithm.AES_GCM}`;
};

export type AESKeyCreateOptionsInput = Partial<AesKeyGenParams> & {
    name: `${SymmetricAlgorithm.AES_CBC}` |
    `${SymmetricAlgorithm.AES_CTR}` |
    `${SymmetricAlgorithm.AES_GCM}`;
};

export type HMACKeyCreateOptions = HmacKeyGenParams & {
    name: `${SymmetricAlgorithm.HMAC}`;
};

export type HMACKeyCreateOptionsInput = Partial<HmacKeyGenParams> & {
    name: `${SymmetricAlgorithm.HMAC}`;
};

export type SymmetricKeyCreateOptions = AESKeyCreateOptions | HMACKeyCreateOptions;
export type SymmetricKeyCreateOptionsInput = AESKeyCreateOptionsInput | HMACKeyCreateOptionsInput;

// -----------------------------------------------

export type AESKeyImportOptions = AesKeyAlgorithm & {
    name: `${SymmetricAlgorithm.AES_CBC}` |
        `${SymmetricAlgorithm.AES_CTR}` |
        `${SymmetricAlgorithm.AES_GCM}`;
};

export type HMACKeyImportOptions = HmacImportParams & {
    name: `${SymmetricAlgorithm.HMAC}`;
};
export type HMACKeyImportOptionsInput = Partial<HmacImportParams> & {
    name: `${SymmetricAlgorithm.HMAC}`;
};

export type SymmetricKeyImportOptions = AESKeyImportOptions | HMACKeyImportOptions;
export type SymmetricKeyImportOptionsInput = AESKeyImportOptions | HMACKeyImportOptionsInput;
