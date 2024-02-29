/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyType, TokenError } from '@authup/core';
import type { JWTClaims, OAuth2TokenPayload } from '@authup/core';
import { Algorithm, verify } from '@node-rs/jsonwebtoken';
import { isKeyPairWithPublicKey, useKeyPair } from '../key-pair';
import type { TokenVerifyOptions } from './type';
import { createErrorForJWTError, transformJWTAlgorithmToInternal } from './utils';

/**
 * Verify JWT.
 *
 * @param token
 * @param context
 *
 * @throws TokenError
 */
export async function verifyToken(
    token: string,
    context: TokenVerifyOptions,
) : Promise<OAuth2TokenPayload> {
    let promise : Promise<JWTClaims>;

    let output : JWTClaims;

    try {
        switch (context.type) {
            case KeyType.RSA:
            case KeyType.EC: {
                const { type, keyPair, ...options } = context;
                const { publicKey } = isKeyPairWithPublicKey(keyPair) ?
                    keyPair :
                    await useKeyPair(keyPair);

                let algorithms : Algorithm[];

                if (type === KeyType.RSA) {
                    algorithms = options.algorithms ?
                        options.algorithms.map((algorithm) => transformJWTAlgorithmToInternal(algorithm)) :
                        [
                            Algorithm.RS256,
                            Algorithm.RS384,
                            Algorithm.RS512,
                            Algorithm.PS256,
                            Algorithm.PS384,
                            Algorithm.PS512,
                        ];
                } else {
                    algorithms = options.algorithms ?
                        options.algorithms.map((algorithm) => transformJWTAlgorithmToInternal(algorithm)) :
                        [
                            Algorithm.ES256,
                            Algorithm.ES384,
                        ];
                }

                promise = verify(token, publicKey, {
                    algorithms,
                });
                break;
            }
            case KeyType.OCT: {
                const { type, secret, ...options } = context;

                const algorithms : Algorithm[] = options.algorithms ?
                    options.algorithms.map((algorithm) => transformJWTAlgorithmToInternal(algorithm)) :
                    [
                        Algorithm.HS256,
                        Algorithm.HS384,
                        Algorithm.HS512,
                    ];

                promise = verify(token, secret, {
                    algorithms,
                });
            }
        }

        output = await promise;
    } catch (e) {
        throw createErrorForJWTError(e);
    }

    if (typeof output === 'undefined') {
        throw new TokenError({ message: 'Invalid type.' });
    }

    return output as OAuth2TokenPayload;
}
