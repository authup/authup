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

    /**
     * issuer (token endpoint, f.e "https://...")
     */
    iss?: string;

    /**
     * subject
     *
     * subject of the JWT
     */
    sub?: string;

    /**
     * audience
     *
     *  Recipient for which the JWT is intended
     */
    aud?: string | string[];

    /**
     * expiration time
     *
     * Time after which the JWT expires
     */
    exp?: number;

    /**
     * not before time
     *
     * Time before which the JWT must not be accepted for processing
     */
    nbf?: number;

    /**
     * issued at time
     */
    iat?: number;

    /**
     * JWT ID
     *
     * Unique identifier; can be used to prevent the JWT from being replayed (allows a token to be used only once)
     */
    jti?: string;
}
