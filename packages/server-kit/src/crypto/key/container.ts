/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { subtle } from 'uncrypto';
import { arrayBufferToBase64, base64ToArrayBuffer } from '@authup/kit';
import type { AsymmetricKeyPairImportOptions } from '../key-asymmetric';
import {
    decodePemToPKCS8,
    decodePemToSpki, encodePKCS8ToPEM, encodeSPKIToPem, normalizeAsymmetricKeyImportOptions,
} from '../key-asymmetric';
import type { SymmetricKeyImportOptions } from '../key-symmetric';
import { normalizeSymmetricKeyImportOptions } from '../key-symmetric/normalize';
import { getKeyUsagesForAlgorithm } from './key-usages';
import type { KeyContainerAsymmetricImportOptions, KeyContainerImportOptions } from './types';

export class CryptoKeyContainer {
    protected key : CryptoKey;

    constructor(cryptoKey : CryptoKey) {
        this.key = cryptoKey;
    }

    // ----------------------------------------------

    async toArrayBuffer(): Promise<ArrayBuffer> {
        if (this.key.type === 'private') {
            return subtle.exportKey('pkcs8', this.key);
        }

        if (this.key.type === 'public') {
            return subtle.exportKey('spki', this.key);
        }

        return subtle.exportKey('raw', this.key);
    }

    async toUint8Array(): Promise<Uint8Array> {
        const arrayBuffer = await this.toArrayBuffer();
        return new Uint8Array(arrayBuffer);
    }

    async toBase64() : Promise<string> {
        const arrayBuffer = await this.toArrayBuffer();
        return arrayBufferToBase64(arrayBuffer);
    }

    async toPem(): Promise<string> {
        const base64 = await this.toBase64();

        if (this.key.type === 'public') {
            return encodeSPKIToPem(base64);
        }

        if (this.key.type === 'private') {
            return encodePKCS8ToPEM(base64);
        }

        throw new Error('A symmetric key can not be encoded as PEM');
    }

    async toJWK() : Promise<JsonWebKey> {
        return subtle.exportKey('jwk', this.key);
    }

    // ----------------------------------------------

    static async fromPem(ctx: KeyContainerAsymmetricImportOptions<string>): Promise<CryptoKeyContainer> {
        if (ctx.format === 'pkcs8') {
            return CryptoKeyContainer.fromBase64({ ...ctx, key: decodePemToPKCS8(ctx.key) });
        }
        return CryptoKeyContainer.fromBase64({ ...ctx, key: decodePemToSpki(ctx.key) });
    }

    static async fromBase64(
        ctx: KeyContainerImportOptions<string>,
    ) : Promise<CryptoKeyContainer> {
        const arrayBuffer = base64ToArrayBuffer(ctx.key);

        return CryptoKeyContainer.fromArrayBuffer({
            ...ctx,
            key: arrayBuffer,
        });
    }

    static async fromArrayBuffer(
        ctx: KeyContainerImportOptions<ArrayBuffer>,
    ) : Promise<CryptoKeyContainer> {
        let normalizedOptions : AsymmetricKeyPairImportOptions | SymmetricKeyImportOptions;
        if (ctx.format === 'spki' || ctx.format === 'pkcs8') {
            normalizedOptions = normalizeAsymmetricKeyImportOptions(ctx.options);
        } else if (ctx.format === 'raw') {
            normalizedOptions = normalizeSymmetricKeyImportOptions(ctx.options);
        } else {
            throw new SyntaxError(`Format ${ctx.format} is not supported.`);
        }

        const cryptoKey = await subtle.importKey(
            ctx.format,
            ctx.key,
            normalizedOptions,
            true,
            getKeyUsagesForAlgorithm(normalizedOptions.name, ctx.format),
        );

        return new CryptoKeyContainer(cryptoKey);
    }
}
