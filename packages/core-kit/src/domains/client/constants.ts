/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The confidential system client provisioned for the master realm.
 */
export const CLIENT_SYSTEM_NAME = 'system';

/**
 * The public OAuth2 client provisioned for every realm for downstream
 * UIs embedding client-web-kit. Authup's own surfaces use the dedicated
 * admin-console / account-console clients instead.
 */
export const CLIENT_WEB_NAME = 'web';

/**
 * The public OAuth2 client provisioned for every realm for authup's own
 * admin console (apps/client-admin-console).
 */
export const CLIENT_ADMIN_CONSOLE_NAME = 'admin-console';

/**
 * The public OAuth2 client provisioned for every realm for authup's
 * account self-service surface (served by server-core).
 */
export const CLIENT_ACCOUNT_CONSOLE_NAME = 'account-console';

/**
 * How an OAuth client authenticates at the token endpoint.
 */
export enum ClientAuthMethod {
    NONE = 'none',
    SECRET = 'secret',
    TLS = 'tls',
}

/**
 * How access and refresh tokens issued to an OAuth client are sender-bound.
 */
export enum ClientTokenBindingMethod {
    NONE = 'none',
    TLS = 'tls',
}

export const CLIENT_CERTIFICATE_URI_PREFIX = 'urn:authup:client:';

/**
 * Client names that are reserved for system-provisioned (built_in)
 * clients. API callers must not create or rename a client to one of
 * these — provisioning bypasses the API and is unaffected.
 */
export const CLIENT_RESERVED_NAMES = [
    CLIENT_SYSTEM_NAME,
    CLIENT_WEB_NAME,
    CLIENT_ADMIN_CONSOLE_NAME,
    CLIENT_ACCOUNT_CONSOLE_NAME,
];
