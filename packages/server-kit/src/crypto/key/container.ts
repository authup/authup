/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { arrayBufferToBase64, base64ToArrayBuffer } from '@authup/kit';
import type { AsymmetricKeyImportOptionsInput, AsymmetricKeyPairImportOptions } from '../key-asymmetric';
import {
    decodePemToPKCS8,
    decodePemToSpki, encodePKCS8ToPEM, encodeSPKIToPem, normalizeAsymmetricKeyImportOptions,
} from '../key-asymmetric';
import type { SymmetricKeyImportOptions, SymmetricKeyImportOptionsInput } from '../key-symmetric';
import { SymmetricAlgorithm } from '../key-symmetric';
import { normalizeSymmetricKeyImportOptions } from '../key-symmetric/normalize';
import { getKeyUsagesForAlgorithm } from './key-usages';
import type { KeyContainerFromOptions } from './types';

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
        options: AsymmetricKeyImportOptionsInput | SymmetricKeyImportOptionsInput,
    ): Promise<CryptoKeyContainer> {
        if (format === 'pkcs8') {
            return CryptoKeyContainer.fromBase64(format, decodePemToPKCS8(key), options);
        }
        return CryptoKeyContainer.fromBase64(format, decodePemToSpki(key), options);
    }

    static async fromBase64(
        format: Exclude<KeyFormat, 'jwk'>,
        key: string,
        options: AsymmetricKeyImportOptionsInput | SymmetricKeyImportOptionsInput,
    ) : Promise<CryptoKeyContainer> {
        const arrayBuffer = base64ToArrayBuffer(key);

        return CryptoKeyContainer.fromArrayBuffer(format, arrayBuffer, options);
    }

    static async fromArrayBuffer<T extends Exclude<KeyFormat, 'jwk'>>(
        format: T,
        key: ArrayBuffer,
        options: KeyContainerFromOptions<T>,
    ) : Promise<CryptoKeyContainer> {
        let normalizedOptions : AsymmetricKeyPairImportOptions | SymmetricKeyImportOptions;
        if (format === 'spki' || format === 'pkcs8') {
            normalizedOptions = normalizeAsymmetricKeyImportOptions(options);
        } else {
            normalizedOptions = normalizeSymmetricKeyImportOptions(options);
        }

        const cryptoKey = await crypto.subtle.importKey(
            format,
            key,
            normalizedOptions,
            true,
            getKeyUsagesForAlgorithm(options.name, format),
        );

        return new CryptoKeyContainer(cryptoKey);
    }
}
