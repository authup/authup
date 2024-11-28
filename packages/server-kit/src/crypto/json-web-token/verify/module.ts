/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '@authup/errors';
import { JWKType } from '@authup/schema';
import type { JWTClaims, OAuth2TokenPayload } from '@authup/schema';
import { Algorithm, verify } from '@node-rs/jsonwebtoken';
import { encodeSPKIToPem } from '../../key-asymmetric';
import { CryptoKeyContainer } from '../../key';
import { createErrorForJWTError, transformJWTAlgorithmToInternal } from '../utils';
import type { TokenVerifyOptions } from './types';

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
            case JWKType.RSA:
            case JWKType.EC: {
                let algorithms : Algorithm[];

                if (context.type === JWKType.RSA) {
                    algorithms = context.algorithms ?
                        context.algorithms.map((algorithm) => transformJWTAlgorithmToInternal(algorithm)) :
                        [
                            Algorithm.RS256,
                            Algorithm.RS384,
                            Algorithm.RS512,
                            Algorithm.PS256,
                            Algorithm.PS384,
                            Algorithm.PS512,
                        ];
                } else {
                    algorithms = context.algorithms ?
                        context.algorithms.map((algorithm) => transformJWTAlgorithmToInternal(algorithm)) :
                        [
                            Algorithm.ES256,
                            Algorithm.ES384,
                        ];
                }

                let key : string;
                if (typeof context.key === 'string') {
                    key = encodeSPKIToPem(context.key);
                } else {
                    const keyContainer = new CryptoKeyContainer(context.key);
                    key = await keyContainer.toPem('spki');
                }

                promise = verify(token, key, {
                    algorithms,
                    validateNbf: true,
                });
                break;
            }
            case JWKType.OCT: {
                const algorithms : Algorithm[] = context.algorithms ?
                    context.algorithms.map((algorithm) => transformJWTAlgorithmToInternal(algorithm)) :
                    [
                        Algorithm.HS256,
                        Algorithm.HS384,
                        Algorithm.HS512,
                    ];

                let key : string | Uint8Array;
                if (typeof context.key === 'string') {
                    key = context.key;
                } else {
                    const keyContainer = new CryptoKeyContainer(context.key);
                    key = await keyContainer.toUint8Array('raw');
                }

                promise = verify(token, key, {
                    algorithms,
                    validateNbf: true,
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
