/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { decode } from 'jsonwebtoken';
import { TokenError } from '@authelion/common';
import { TokenDecodeOptions } from './type';
import { handleJWTError } from './utils';

/**
 * Decode a JWT token with no verification.
 *
 * @param token
 * @param options
 *
 * @throws TokenError
 */
export async function decodeToken(
    token: string,
    options?: TokenDecodeOptions,
): Promise<string | Record<string, any> | null> {
    options ??= {};

    try {
        return decode(token, options);
    } catch (e) {
        handleJWTError(e);

        throw e;
    }
}
