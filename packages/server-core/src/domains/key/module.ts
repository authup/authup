/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWKType, JWTAlgorithm } from '@authup/schema';
import type { KeyImportOptions, KeyPairImportOptionsInput } from '@authup/server-kit';
import {
    CryptoAsymmetricAlgorithm,
    CryptoKeyContainer,
    CryptoSymmetricAlgorithm,
} from '@authup/server-kit';
import type { KeyEntity } from '../../database/domains';

function buildSymmetricKeyImportOptions(key: KeyEntity) : KeyImportOptions {
    let importOptions: KeyImportOptions;

    switch (key.signature_algorithm) {
        case JWTAlgorithm.HS256: {
            importOptions = {
                name: CryptoSymmetricAlgorithm.HMAC,
                hash: 'SHA-256',
            };
            break;
        }
        case JWTAlgorithm.HS384: {
            importOptions = {
                name: CryptoSymmetricAlgorithm.HMAC,
                hash: 'SHA-384',
            };
            break;
        }
        case JWTAlgorithm.HS512: {
            importOptions = {
                name: CryptoSymmetricAlgorithm.HMAC,
                hash: 'SHA-512',
            };
            break;
        }
        default: {
            throw new Error(`Signature algorithm ${this.key.signature_algorithm} is not supported.`);
        }
    }
    return importOptions;
}

function buildAsymmetricKeyImportOptions(key: KeyEntity) : KeyPairImportOptionsInput {
    let importOptions : KeyPairImportOptionsInput;

    switch (key.signature_algorithm) {
        case JWTAlgorithm.RS256: {
            importOptions = {
                name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
                hash: 'SHA-256',
            };
            break;
        }
        case JWTAlgorithm.RS384: {
            importOptions = {
                name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
                hash: 'SHA-384',
            };
            break;
        }
        case JWTAlgorithm.RS512: {
            importOptions = {
                name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
                hash: 'SHA-512',
            };
            break;
        }
        case JWTAlgorithm.ES256: {
            importOptions = {
                name: CryptoAsymmetricAlgorithm.ECDSA,
                namedCurve: 'P-256',
            };
            break;
        }
        case JWTAlgorithm.ES384: {
            importOptions = {
                name: CryptoAsymmetricAlgorithm.ECDSA,
                namedCurve: 'P-384',
            };
            break;
        }
        default: {
            throw new Error(`Signature algorithm ${this.key.signature_algorithm} is not supported.`);
        }
    }

    return importOptions;
}

export async function transformEncryptionKeyToJsonWebKey(key: KeyEntity) : Promise<JsonWebKey> {
    if (key.type === JWKType.OCT) {
        throw new Error('Encryption key does not exist for OCT.');
    }

    const keyContainer = await CryptoKeyContainer.fromBase64(
        'spki',
        key.encryption_key,
        buildAsymmetricKeyImportOptions(key),
    );

    const jwk = await keyContainer.toJWK();
    jwk.alg = key.signature_algorithm;
    (jwk as any).kid = key.id;

    return jwk;
}

export async function transformDecryptionKeyToJsonWebKey(key: KeyEntity) : Promise<JsonWebKey> {
    let keyContainer : CryptoKeyContainer;
    if (key.type === JWKType.RSA || key.type === JWKType.EC) {
        keyContainer = await CryptoKeyContainer.fromBase64(
            'pkcs8',
            key.decryption_key,
            buildAsymmetricKeyImportOptions(key),
        );
    } else {
        keyContainer = await CryptoKeyContainer.fromBase64(
            'raw',
            key.decryption_key,
            buildSymmetricKeyImportOptions(key),
        );
    }

    const jwk = await keyContainer.toJWK();
    jwk.alg = key.signature_algorithm;
    (jwk as any).kid = key.id;

    return jwk;
}
