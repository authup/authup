/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum JWKType {
    /**
     * Octet/Byte sequence (used to represent symmetric keys)
     */
    OCT = 'oct',
    /**
     * RSA
     */
    RSA = 'rsa',
    /**
     * Elliptic Curve
     */
    EC = 'ec',
}

/**
 * Intended usage of a key (RFC 7517 §4.2).
 */
export enum JWKUse {
    /**
     * Signing / verifying tokens.
     */
    SIGNATURE = 'sig',
    /**
     * Encrypting data at rest (e.g. MFA seeds).
     */
    ENCRYPTION = 'enc',
}
