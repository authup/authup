/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '@authup/core';
import { KeyType, TokenError } from '@authup/core';
import type { Claims } from '@node-rs/jsonwebtoken';
import { Algorithm, sign } from '@node-rs/jsonwebtoken';
import { isKeyPair, useKeyPair } from '../key-pair';
import type { TokenSignOptions } from './type';
import { transformJWTAlgorithm } from './utils';

const getUtcTimestamp = () => Math.floor(new Date().getTime() / 1000);

export async function signToken(data: JWTClaims, context: TokenSignOptions): Promise<string> {
    const claims : Claims = {};
    claims.data = data;
    claims.exp = data.exp ?? getUtcTimestamp() + 3600;
    claims.iat = data.iat ?? getUtcTimestamp();
    claims.iss = data.iss;
    claims.jti = data.jti;
    claims.nbf = data.nbf;
    claims.sub = data.sub;
    claims.aud = Array.isArray(data.aud) ? undefined : data.aud;

    switch (context.type) {
        case KeyType.RSA:
        case KeyType.EC: {
            const { type, keyPair, ...options } = context;
            const { privateKey } = isKeyPair(keyPair) ?
                keyPair :
                await useKeyPair(keyPair);

            let algorithm : Algorithm;

            if (type === KeyType.RSA) {
                algorithm = options.algorithm ?
                    transformJWTAlgorithm(options.algorithm) :
                    Algorithm.RS256;
            } else {
                algorithm = options.algorithm ?
                    transformJWTAlgorithm(options.algorithm) :
                    Algorithm.ES256;
            }

            return sign(claims, privateKey, {
                algorithm,
                keyId: options.keyId,
            });
        }
        case KeyType.OCT: {
            const { type, secret, ...options } = context;
            const algorithm : Algorithm = options.algorithm ?
                transformJWTAlgorithm(options.algorithm) :
                Algorithm.HS256;

            return sign(claims, secret, {
                algorithm,
                keyId: options.keyId,
            });
        }
    }

    throw new TokenError();
}
