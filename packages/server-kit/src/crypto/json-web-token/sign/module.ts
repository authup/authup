/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '@authup/errors';
import type { JWTClaims } from '@authup/schema';
import { JWKType } from '@authup/schema';
import { Algorithm, sign } from '@node-rs/jsonwebtoken';
import { isKeyPair, useKeyPair } from '../../key-pair';
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
            const { privateKey } = isKeyPair(context.keyPair) ?
                context.keyPair :
                await useKeyPair(context.keyPair);

            let algorithm : Algorithm;

            if (context.type === JWKType.RSA) {
                algorithm = context.algorithm ?
                    transformJWTAlgorithmToInternal(context.algorithm) :
                    Algorithm.RS256;
            } else {
                algorithm = context.algorithm ?
                    transformJWTAlgorithmToInternal(context.algorithm) :
                    Algorithm.ES256;
            }

            return sign(claims, privateKey, {
                algorithm,
                keyId: context.keyId,
            });
        }
        case JWKType.OCT: {
            const algorithm : Algorithm = context.algorithm ?
                transformJWTAlgorithmToInternal(context.algorithm) :
                Algorithm.HS256;

            return sign(claims, context.key, {
                algorithm,
                keyId: context.keyId,
            });
        }
    }

    throw new TokenError();
}
