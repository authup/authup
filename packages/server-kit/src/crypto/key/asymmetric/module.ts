/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { base64ToArrayBuffer } from '@authup/kit';
import { JWTAlgorithm } from '@authup/specs';
import { subtle } from 'uncrypto';
import { BaseKey } from '../base';
import { CryptoAsymmetricAlgorithm } from './constants';
import type { AsymmetricKeyImportContext } from './types';
import {
    decodePemToPKCS8, decodePemToSpki, encodePKCS8ToPEM, encodeSPKIToPem,
} from './helpers';
import { getKeyUsagesForAsymmetricAlgorithm } from './key-usages';
import { normalizeAsymmetricKeyImportOptions } from './normalize';

export class AsymmetricKey extends BaseKey {
    async toPem(): Promise<string> {
        const base64 = await this.toBase64();

        if (this.key.type === 'public') {
            return encodeSPKIToPem(base64);
        }

        if (this.key.type === 'private') {
            return encodePKCS8ToPEM(base64);
        }

        throw new Error(`${this.key.type} can not be converted to pem.`);
    }

    // ----------------------------------------------------------------

    static async fromPem(ctx: AsymmetricKeyImportContext<string>): Promise<AsymmetricKey> {
        if (ctx.format === 'pkcs8') {
            return AsymmetricKey.fromBase64({ ...ctx, key: decodePemToPKCS8(ctx.key) });
        }
        return AsymmetricKey.fromBase64({ ...ctx, key: decodePemToSpki(ctx.key) });
    }

    static async fromBase64(
        ctx: AsymmetricKeyImportContext<string>,
    ) : Promise<AsymmetricKey> {
        const arrayBuffer = base64ToArrayBuffer(ctx.key);

        return AsymmetricKey.fromArrayBuffer({
            ...ctx,
            key: arrayBuffer,
        });
    }

    static async fromArrayBuffer(
        ctx: AsymmetricKeyImportContext<ArrayBuffer>,
    ) : Promise<AsymmetricKey> {
        const normalizedOptions = normalizeAsymmetricKeyImportOptions(ctx.options);

        const cryptoKey = await subtle.importKey(
            ctx.format,
            ctx.key,
            normalizedOptions,
            true,
            getKeyUsagesForAsymmetricAlgorithm(normalizedOptions.name, ctx.format),
        );

        return new AsymmetricKey(cryptoKey);
    }

    // ----------------------------------------------------------------

    static buildImportOptionsForJWTAlgorithm(alg: `${JWTAlgorithm}`) {
        if (alg === JWTAlgorithm.RS256) {
            return {
                name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
                hash: 'SHA-256',
            };
        }

        if (alg === JWTAlgorithm.RS384) {
            return {
                name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
                hash: 'SHA-384',
            };
        }

        if (alg === JWTAlgorithm.RS512) {
            return {
                name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
                hash: 'SHA-512',
            };
        }

        if (alg === JWTAlgorithm.ES256) {
            return {
                name: CryptoAsymmetricAlgorithm.ECDSA,
                namedCurve: 'P-256',
            };
        }

        if (alg === JWTAlgorithm.ES384) {
            return {
                name: CryptoAsymmetricAlgorithm.ECDSA,
                namedCurve: 'P-384',
            };
        }

        if (alg === JWTAlgorithm.ES512) {
            return {
                name: CryptoAsymmetricAlgorithm.ECDSA,
                namedCurve: 'P-521',
            };
        }

        throw new Error(`Signature algorithm ${alg} is not supported.`);
    }
}
