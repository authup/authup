/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Row-type of an authenticator device. All kinds share one table;
 * kind-specific state lives in the secret/parameters/codes columns.
 */
export enum UserAuthenticatorKind {
    /**
     * TOTP authenticator app (RFC 6238).
     */
    TOTP = 'totp',

    /**
     * Single-use recovery codes.
     */
    RECOVERY = 'recovery',

    /**
     * Short-lived numeric code delivered to the user's email address.
     */
    EMAIL = 'email',

    /**
     * WebAuthn credential (passkey / security key) as a second factor.
     */
    WEBAUTHN = 'webauthn',
}
