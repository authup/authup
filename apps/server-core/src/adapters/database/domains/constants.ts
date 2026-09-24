/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildCacheKey } from '@authup/server-kit';

export enum CachePrefix {
    AUTHORIZATION = 'authorization',

    IDENTITY_PROVIDER = 'identity_provider',
    IDENTITY_PROVIDER_ACCOUNT = 'identity_provider_account',
    IDENTITY_PROVIDER_ATTRIBUTE = 'identity_provider_attribute',
    IDENTITY_PROVIDER_ROLE = 'identity_provider_role',

    OAUTH2_AUTHORIZATION_CODE = 'oauth2_authorization_code',

    CLIENT = 'client',
    CLIENT_OWNED_PERMISSIONS = 'client_owned_permissions',
    CLIENT_OWNED_ROLES = 'client_owned_roles',
    CLIENT_SCOPE = 'client_scope',

    CONSENT_COVERING = 'consent_covering',

    USER = 'user',
    USER_OWNED_ATTRIBUTES = 'user_owned_attributes',
    USER_OWNED_PERMISSIONS = 'user_owned_permissions',
    USER_OWNED_ROLES = 'user_owned_roles',

    KEY = 'key',

    POLICY = 'policy',
    PERMISSION = 'permission',

    REALM = 'realm',

    POLICY_OWNED_ATTRIBUTES = 'policy_owned_attributes',


    ROLE = 'role',
    ROLE_OWNED_PERMISSIONS = 'role_owned_permissions',
}

export const AUTHORIZATION_DEFINITIONS_CACHE_KEY = buildCacheKey({
    prefix: CachePrefix.AUTHORIZATION,
    key: 'definitions',
});

export const AUTHORIZATION_GRANT_POLICIES_CACHE_KEY = buildCacheKey({
    prefix: CachePrefix.AUTHORIZATION,
    key: 'grant_policies',
});

/**
 * The generation a cached catalog read was taken in. A stored value counts
 * only while this key still holds the generation it was tagged with, so a read
 * that straddles a write's commit can never be served afterwards (#3599).
 */
export const AUTHORIZATION_EPOCH_CACHE_KEY = buildCacheKey({
    prefix: CachePrefix.AUTHORIZATION,
    key: 'epoch',
});

/**
 * Every write to a table the authorization catalog reads drops these (#3599).
 */
export const AUTHORIZATION_CACHE_KEYS = [
    AUTHORIZATION_EPOCH_CACHE_KEY,
    AUTHORIZATION_DEFINITIONS_CACHE_KEY,
    AUTHORIZATION_GRANT_POLICIES_CACHE_KEY,
];
