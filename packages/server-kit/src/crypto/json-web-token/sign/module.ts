/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWKType, TokenError } from '@authup/security';
import type { JWTClaims } from '@authup/security';
import { Algorithm, sign } from '@node-rs/jsonwebtoken';
import { encodePKCS8ToPEM } from '../../key-asymmetric';
import { CryptoKeyContainer } from '../../key';
import { transformJWTAlgorithmToInternal } from '../utils';
import type { TokenSignOptions } from './types';

const getUtcTimestamp = () => Math.floor(new Date().getTime() / 1000);

export async function signToken(claims: JWTClaims, context: TokenSignOptions): Promise<string> {
    if (typeof claims.exp !== 'number') {
        claims.exp = getUtcTimestamp() + 3600;
    }
    if (typeof claims.iat !== 'number') {
        claims.iat = getUtcTimestamp();
    }

    switch (context.type) {
        case JWKType.RSA:
        case JWKType.EC: {
            let algorithm : Algorithm;

            let key : string;
            if (typeof context.key === 'string') {
                key = encodePKCS8ToPEM(context.key);
            } else {
                const keyContainer = new CryptoKeyContainer(context.key);
                key = await keyContainer.toPem('pkcs8');
            }

            if (context.type === JWKType.RSA) {
                algorithm = context.algorithm ?
                    transformJWTAlgorithmToInternal(context.algorithm) :
                    Algorithm.RS256;
            } else {
                algorithm = context.algorithm ?
                    transformJWTAlgorithmToInternal(context.algorithm) :
                    Algorithm.ES256;
            }

            return sign(claims, key, {
                algorithm,
                keyId: context.keyId,
            });
        }
        case JWKType.OCT: {
            const algorithm : Algorithm = context.algorithm ?
                transformJWTAlgorithmToInternal(context.algorithm) :
                Algorithm.HS256;

            let key : string | Uint8Array;
            if (typeof context.key === 'string') {
                key = context.key;
            } else {
                const keyContainer = new CryptoKeyContainer(context.key);
                key = await keyContainer.toUint8Array('raw');
            }

            return sign(claims, key, {
                algorithm,
                keyId: context.keyId,
            });
        }
    }

    throw new TokenError();
}
