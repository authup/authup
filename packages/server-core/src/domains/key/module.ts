/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWTAlgorithm } from '@authup/schema';
import type { KeyImportOptions, KeyPairImportOptions } from '@authup/server-kit';
import {
    CryptoAsymmetricAlgorithm,
    CryptoKeyContainer,
    CryptoSymmetricAlgorithm,
} from '@authup/server-kit';

function buildImportOptionsForSigningAlgorithm(
    signingAlgorithm: `${JWTAlgorithm}`,
) : KeyPairImportOptions | KeyImportOptions {
    if (signingAlgorithm === JWTAlgorithm.HS256) {
        return {
            name: CryptoSymmetricAlgorithm.HMAC,
            hash: 'SHA-256',
        };
    }

    if (signingAlgorithm === JWTAlgorithm.HS384) {
        return {
            name: CryptoSymmetricAlgorithm.HMAC,
            hash: 'SHA-384',
        };
    }

    if (signingAlgorithm === JWTAlgorithm.HS512) {
        return {
            name: CryptoSymmetricAlgorithm.HMAC,
            hash: 'SHA-512',
        };
    }

    if (signingAlgorithm === JWTAlgorithm.RS256) {
        return {
            name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
            hash: 'SHA-256',
        };
    }

    if (signingAlgorithm === JWTAlgorithm.RS384) {
        return {
            name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
            hash: 'SHA-384',
        };
    }

    if (signingAlgorithm === JWTAlgorithm.RS512) {
        return {
            name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
            hash: 'SHA-512',
        };
    }

    if (signingAlgorithm === JWTAlgorithm.ES256) {
        return {
            name: CryptoAsymmetricAlgorithm.ECDSA,
            namedCurve: 'P-256',
        };
    }

    if (signingAlgorithm === JWTAlgorithm.ES384) {
        return {
            name: CryptoAsymmetricAlgorithm.ECDSA,
            namedCurve: 'P-384',
        };
    }

    if (signingAlgorithm === JWTAlgorithm.ES512) {
        return {
            name: CryptoAsymmetricAlgorithm.ECDSA,
            namedCurve: 'P-521',
        };
    }

    throw new Error(`Signature algorithm ${this.key.signature_algorithm} is not supported.`);
}

export async function transformBase64KeyToJsonWebKey(
    format: Exclude<KeyFormat, 'jwk'>,
    key: string,
    signingAlgorithm: `${JWTAlgorithm}`,
) : Promise<JsonWebKey> {
    const keyContainer = await CryptoKeyContainer.fromBase64(
        format,
        key,
        buildImportOptionsForSigningAlgorithm(signingAlgorithm),
    );

    const jwk = await keyContainer.toJWK();
    jwk.alg = signingAlgorithm;

    return jwk;
}
