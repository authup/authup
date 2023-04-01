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
import { handleJWTError } from './utils';

/**
 * Decode a JWT token with no verification.
 *
 * @param token
 * @param options
 *
 * @throws TokenError
 */
export function decodeToken(token: string, options: TokenDecodeOptions & { complete: true }): null | Jwt;
export function decodeToken(token: string, options?: TokenDecodeOptions): JwtPayload | string | null;
export function decodeToken(
    token: string,
    options?: TokenDecodeOptions,
): JwtPayload | string | null {
    options ??= {};

    try {
        return decode(token, {
            ...options,
        });
    } catch (e) {
        handleJWTError(e);

        throw e;
    }
}
