/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims, JWTHeader } from '@authup/specs';
import { JWTError } from '@authup/specs';

/**
 * Decode a JWT token with no verification.
 *
 * @param token
 *
 * @throws JWTError
 */
export function extractTokenHeader(
    token: string,
) : JWTHeader {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw JWTError.invalid();
    }

    const [headerBase64] = parts;

    try {
        const payload = atob(headerBase64);

        return JSON.parse(payload);

        /*
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
         */
    } catch {
        throw JWTError.headerInvalid('The token header could not be extracted.');
    }
}

/**
 * @param token
 *
 * @throws JWTError
 */
export function extractTokenPayload(
    token: string,
) : JWTClaims {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw JWTError.invalid();
    }

    const [, payloadBase64] = parts;

    try {
        // A JWT payload is base64URL (RFC 7515 §2), which `atob` rejects on
        // its `-`/`_` characters, and `atob` yields latin1 while the payload
        // is UTF-8 (RFC 7519 §3). Any claim outside ASCII produces one or the
        // other, so a token carrying a name like `Пётр` or an emoji failed to
        // decode at all.
        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(normalized);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        throw JWTError.payloadInvalid('The token payload could not be extracted.');
    }
}
