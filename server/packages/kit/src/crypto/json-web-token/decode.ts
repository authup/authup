/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Jwt,
    JwtPayload,
} from 'jsonwebtoken';
import {
    decode,
} from 'jsonwebtoken';
import { TokenError } from '@authup/core';
import type { TokenDecodeOptions } from './type';
import { createErrorForJWTError } from './utils';

/**
 * Decode a JWT token with no verification.
 *
 * @param token
 * @param options
 *
 * @throws TokenError
 */
export function decodeToken(token: string, options: TokenDecodeOptions & { complete: true }): Jwt;
export function decodeToken(token: string, options?: TokenDecodeOptions): JwtPayload | string;
export function decodeToken(
    token: string,
    options?: TokenDecodeOptions,
): JwtPayload | string {
    options ??= {};

    let output : string | JwtPayload | null;

    try {
        output = decode(token, {
            ...options,
        });
    } catch (e) {
        throw createErrorForJWTError(e);
    }

    if (output === null) {
        throw TokenError.payloadInvalid('The token could not be decoded.');
    }

    return output;
}
