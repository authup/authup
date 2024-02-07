/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWTAlgorithm, TokenError } from '@authup/core';
import { Algorithm } from '@node-rs/jsonwebtoken';
import { isObject } from 'smob';

export function createErrorForJWTError(e: unknown) : TokenError {
    if (isObject(e)) {
        if (typeof e.name === 'string') {
            switch (e.name) {
                case 'TokenExpiredError': {
                    return TokenError.expired();
                }
                case 'NotBeforeError': {
                    if (typeof e.date === 'string' || e.date instanceof Date) {
                        return TokenError.notActiveBefore(e.date);
                    }
                    break;
                }
                case 'JsonWebTokenError': {
                    if (typeof e.message === 'string') {
                        return TokenError.payloadInvalid(e.message);
                    }

                    break;
                }
            }
        }

        // @see https://github.com/Keats/jsonwebtoken/blob/master/src/errors.rs
        switch (e.message) {
            case 'ExpiredSignature': {
                return TokenError.expired();
            }
            case 'ImmatureSignature': {
                return TokenError.notActiveBefore();
            }
            case 'InvalidToken':
            case 'InvalidSignature': {
                return TokenError.payloadInvalid();
            }
        }
    }

    return new TokenError({
        cause: e as Error,
        logMessage: true,
        message: 'The JWT error could not be determined.',
    });
}

export function transformJWTAlgorithm(algorithm: JWTAlgorithm) : Algorithm {
    switch (algorithm) {
        case JWTAlgorithm.HS256: {
            return Algorithm.HS256;
        }
        case JWTAlgorithm.HS384: {
            return Algorithm.HS384;
        }
        case JWTAlgorithm.HS512: {
            return Algorithm.HS512;
        }
        case JWTAlgorithm.RS256: {
            return Algorithm.RS256;
        }
        case JWTAlgorithm.RS384: {
            return Algorithm.RS384;
        }
        case JWTAlgorithm.RS512: {
            return Algorithm.RS512;
        }
        case JWTAlgorithm.ES256: {
            return Algorithm.ES256;
        }
        case JWTAlgorithm.ES384: {
            return Algorithm.ES384;
        }
        case JWTAlgorithm.PS256: {
            return Algorithm.PS256;
        }
        case JWTAlgorithm.PS384: {
            return Algorithm.PS384;
        }
        case JWTAlgorithm.PS512: {
            return Algorithm.PS512;
        }
    }

    throw new Error(`Token algorithm d${algorithm} is not implemented.`);
}
