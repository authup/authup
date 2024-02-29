/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '@authup/core';
import { KeyType, TokenError } from '@authup/core';
import { Algorithm, sign } from '@node-rs/jsonwebtoken';
import { isKeyPair, useKeyPair } from '../key-pair';
import type { TokenSignOptions } from './type';
import { transformJWTAlgorithmToInternal } from './utils';

const getUtcTimestamp = () => Math.floor(new Date().getTime() / 1000);

export async function signToken(claims: JWTClaims, context: TokenSignOptions): Promise<string> {
    if (typeof claims.exp !== 'number') {
        claims.exp = getUtcTimestamp() + 3600;
    }
    if (typeof claims.iat !== 'number') {
        claims.iat = getUtcTimestamp();
    }

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
                    transformJWTAlgorithmToInternal(options.algorithm) :
                    Algorithm.RS256;
            } else {
                algorithm = options.algorithm ?
                    transformJWTAlgorithmToInternal(options.algorithm) :
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
                transformJWTAlgorithmToInternal(options.algorithm) :
                Algorithm.HS256;

            return sign(claims, secret, {
                algorithm,
                keyId: options.keyId,
            });
        }
    }

    throw new TokenError();
}
