/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { arrayBufferToBase64, base64ToArrayBuffer } from '@authup/kit';
import {
    decodePemToPKCS8,
    decodePemToSpki,
    encodePKCS8ToPEM,
    encodeSPKIToPem,
    getDefaultKeyUsagesForAsymmetricAlgorithm,
} from '../key-asymmetric';
import { getDefaultKeyUsagesForSymmetricAlgorithm } from '../key-symmetric';

export class CryptoKeyContainer {
    protected key : CryptoKey;

    constructor(cryptoKey : CryptoKey) {
        this.key = cryptoKey;
    }

    // ----------------------------------------------

    async toArrayBuffer(format: Exclude<KeyFormat, 'jwk'>): Promise<ArrayBuffer> {
        return crypto.subtle.exportKey(format, this.key);
    }

    async toUint8Array(format: Exclude<KeyFormat, 'jwk'>): Promise<Uint8Array> {
        const arrayBuffer = await this.toArrayBuffer(format);
        return new Uint8Array(arrayBuffer);
    }

    async toBase64(format: Exclude<KeyFormat, 'jwk'>) : Promise<string> {
        const arrayBuffer = await this.toArrayBuffer(format);
        return arrayBufferToBase64(arrayBuffer);
    }

    async toPem(format: Exclude<KeyFormat, 'jwk' | 'raw'>): Promise<string> {
        const base64 = await this.toBase64(format);

        if (format === 'spki') {
            return encodeSPKIToPem(base64);
        }

        return encodePKCS8ToPEM(base64);
    }

    async toJWK() : Promise<JsonWebKey> {
        return crypto.subtle.exportKey('jwk', this.key);
    }

    // ----------------------------------------------

    static async fromPem(
        format: Exclude<KeyFormat, 'jwk' | 'raw'>,
        key: string,
        options: Algorithm | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm,
    ): Promise<CryptoKeyContainer> {
        if (format === 'pkcs8') {
            return CryptoKeyContainer.fromBase64(format, decodePemToPKCS8(key), options);
        }
        return CryptoKeyContainer.fromBase64(format, decodePemToSpki(key), options);
    }

    static async fromBase64(
        format: Exclude<KeyFormat, 'jwk'>,
        key: string,
        options: Algorithm | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm,
    ) : Promise<CryptoKeyContainer> {
        const arrayBuffer = base64ToArrayBuffer(key);

        return CryptoKeyContainer.fromArrayBuffer(format, arrayBuffer, options);
    }

    static async fromArrayBuffer(
        format: Exclude<KeyFormat, 'jwk'>,
        key: ArrayBuffer,
        options: Algorithm | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm,
    ) : Promise<CryptoKeyContainer> {
        let keyUsages = getDefaultKeyUsagesForAsymmetricAlgorithm(options.name);
        if (!keyUsages) {
            keyUsages = getDefaultKeyUsagesForSymmetricAlgorithm(options.name);
        }
        const cryptoKey = await crypto.subtle.importKey(
            format,
            key,
            options,
            true,
            keyUsages || [],
        );

        return new CryptoKeyContainer(cryptoKey);
    }
}
