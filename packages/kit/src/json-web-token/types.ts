/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// standard names https://www.rfc-editor.org/rfc/rfc7515.html#section-4.1
export interface JWTHeader {
    alg?: string;
    typ?: string;
    cty?: string;
    crit?: string[];
    kid?: string;
    jku?: string;
    x5u?: string | string[];
    'x5t#S256'?: string;
    x5t?: string;
    x5c?: string | string[];
}

// standard claims https://datatracker.ietf.org/doc/html/rfc7519#section-4.1
export interface JWTClaims {
    [key: string]: any;
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
}

// -----------------------------------------------------------------
