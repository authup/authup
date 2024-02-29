/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTHeader } from '@authup/core';
import { TokenError } from '@authup/core';
import { decodeHeader } from '@node-rs/jsonwebtoken';
import { transformInternalToJWTAlgorithm } from './utils';

/**
 * Decode a JWT token with no verification.
 *
 * @param token
 *
 * @throws TokenError
 */
export function decodeTokenHeader(
    token: string,
) : JWTHeader {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw TokenError.payloadInvalid('The token format is not valid.');
    }

    try {
        const header = decodeHeader(token);

        return {
            typ: 'JWT',
            alg: transformInternalToJWTAlgorithm(header.algorithm),
            cty: header.contentType,
            jku: header.jsonKeyUrl,
            kid: header.keyId,
            x5u: header.x5Url,
            x5c: header.x5CertChain,
            x5t: header.x5CertThumbprint,
            'x5t#S256': header.x5TS256CertThumbprint,
        };
    } catch (e) {
        throw TokenError.payloadInvalid('The token header could not be extracted.');
    }
}
