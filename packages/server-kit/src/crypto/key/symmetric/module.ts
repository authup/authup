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
import { SymmetricAlgorithm } from './constants';
import { getKeyUsagesForSymmetricAlgorithm } from './key-usages';
import { normalizeSymmetricKeyImportOptions } from './normalize';
import type { SymmetricKeyImportContext, SymmetricKeyImportOptions } from './types';

export class SymmetricKey extends BaseKey {
    static async fromBase64(
        ctx: SymmetricKeyImportContext<string>,
    ) : Promise<SymmetricKey> {
        const arrayBuffer = base64ToArrayBuffer(ctx.key);

        return SymmetricKey.fromArrayBuffer({
            ...ctx,
            key: arrayBuffer,
        });
    }

    static async fromArrayBuffer(
        ctx: SymmetricKeyImportContext<ArrayBuffer>,
    ) : Promise<SymmetricKey> {
        const normalizedOptions : SymmetricKeyImportOptions = normalizeSymmetricKeyImportOptions(ctx.options);

        const cryptoKey = await subtle.importKey(
            ctx.format,
            ctx.key,
            normalizedOptions,
            true,
            getKeyUsagesForSymmetricAlgorithm(normalizedOptions.name),
        );

        return new SymmetricKey(cryptoKey);
    }

    static buildImportOptionsForJWTAlgorithm(alg: `${JWTAlgorithm}`) {
        if (alg === JWTAlgorithm.HS256) {
            return {
                name: SymmetricAlgorithm.HMAC,
                hash: 'SHA-256',
            };
        }

        if (alg === JWTAlgorithm.HS384) {
            return {
                name: SymmetricAlgorithm.HMAC,
                hash: 'SHA-384',
            };
        }

        if (alg === JWTAlgorithm.HS512) {
            return {
                name: SymmetricAlgorithm.HMAC,
                hash: 'SHA-512',
            };
        }

        throw new Error(`Signature algorithm ${alg} is not supported.`);
    }
}
