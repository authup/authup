/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTHeader } from '@authup/core';
import { TokenError } from '@authup/core';

type HeaderInternal = {
    /**
     * The type of JWS
     */
    typ?: string,
    /**
     * The algorithm
     */
    alg?: string,
    /**
     * Content Type
     */
    cty?: string,
    /**
     * JSON Key URL
     */
    jku?: string
    /**
     * JSON Web Key
     */
    jwk?: string,
    /**
     * Key ID
     */
    kid?: string,
    /**
     * X.509 URL
     */
    x5u?: string,
    /**
     * X.509 certificate chain. An array of base64 encoded ASN.1 DER certificates.
     */
    x5c?: string[],
    /**
     * X.509 SHA1 certificate thumbprint
     */
    x5t?: string,
    /**
     * X.509 SHA256 certificate thumbprint
     */
    x5t_s256?: string
};

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
        const raw = Buffer.from(parts[0], 'base64').toString();

        const { x5t_s256: x5tS256, ...rest } = JSON.parse(raw) as HeaderInternal;

        return {
            ...rest,
            ...(x5tS256 ? { 'x5t#S256': x5tS256 } : {}),
        };
    } catch (e) {
        throw TokenError.payloadInvalid('The token could not be decoded.');
    }
}
