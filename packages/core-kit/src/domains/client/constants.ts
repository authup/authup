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
 * The public OAuth2 client provisioned for every realm. Shared by
 * authup's own client-web and any downstream UI embedding client-web-kit.
 */
export const CLIENT_WEB_NAME = 'web';

/**
 * Client names that are reserved for system-provisioned (built_in)
 * clients. API callers must not create or rename a client to one of
 * these — provisioning bypasses the API and is unaffected.
 */
export const CLIENT_RESERVED_NAMES = [
    CLIENT_SYSTEM_NAME,
    CLIENT_WEB_NAME,
];
