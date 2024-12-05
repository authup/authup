/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CryptoAsymmetricAlgorithm } from './constants';

export type KeyPairFormatted<T = string> = {
    privateKey: T,
    publicKey: T
};

export type RSAKeyPairCreateOptions = RsaHashedKeyGenParams & {
    name: CryptoAsymmetricAlgorithm.RSA_OAEP |
    CryptoAsymmetricAlgorithm.RSA_PSS |
    CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5
};

export type RSAKeyPairCreateOptionsInput = Partial<RsaHashedKeyGenParams> & {
    name: CryptoAsymmetricAlgorithm.RSA_OAEP |
    CryptoAsymmetricAlgorithm.RSA_PSS |
    CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5
};

export type ECKeyPairCreateOptions = EcKeyGenParams & {
    name: CryptoAsymmetricAlgorithm.ECDSA |
    CryptoAsymmetricAlgorithm.ECDH
};
export type ECKeyPairCreateOptionsInput = Partial<EcKeyGenParams> & {
    name: CryptoAsymmetricAlgorithm.ECDSA |
    CryptoAsymmetricAlgorithm.ECDH
};

export type AsymmetricKeyPairCreateOptions = RSAKeyPairCreateOptions |
ECKeyPairCreateOptions;

export type AsymmetricKeyPairCreateOptionsInput = RSAKeyPairCreateOptionsInput | ECKeyPairCreateOptionsInput;

// ----------------------------------------------------------------

export type RSAKeyPairImportOptions = RsaHashedImportParams & {
    name: CryptoAsymmetricAlgorithm.RSA_OAEP |
    CryptoAsymmetricAlgorithm.RSA_PSS |
    CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5
};

export type RSAKeyPairImportOptionsInput = Partial<RsaHashedImportParams> & {
    name: CryptoAsymmetricAlgorithm.RSA_OAEP |
    CryptoAsymmetricAlgorithm.RSA_PSS |
    CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5
};

export type ECKeyPairImportOptions = EcKeyImportParams & {
    name: CryptoAsymmetricAlgorithm.ECDSA |
    CryptoAsymmetricAlgorithm.ECDH
};
export type ECKeyPairImportOptionsInput = Partial<EcKeyImportParams> & {
    name: CryptoAsymmetricAlgorithm.ECDSA |
    CryptoAsymmetricAlgorithm.ECDH
};

export type AsymmetricKeyPairImportOptions = RSAKeyPairImportOptions |
ECKeyPairImportOptions;

export type AsymmetricKeyImportOptionsInput = RSAKeyPairImportOptionsInput | ECKeyPairImportOptionsInput;
