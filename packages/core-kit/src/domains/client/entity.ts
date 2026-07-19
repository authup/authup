/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '../policy';
import type { Realm } from '../realm';
import type { ClientAuthMethod, ClientTokenBindingMethod } from './constants';

export interface Client {
    id: string,

    // ------------------------------------------------------------------

    active: boolean;

    builtIn: boolean;

    authMethod: `${ClientAuthMethod}`,

    tokenBindingMethod: `${ClientTokenBindingMethod}`,

    // ------------------------------------------------------------------

    name: string,

    displayName: string | null;

    description: string | null,

    // ------------------------------------------------------------------

    secret: string | null,

    secretHashed: boolean,

    secretEncrypted: boolean,

    // ------------------------------------------------------------------

    redirectUri: string | null,

    /**
     * Comma-separated allow-list of post-logout redirect patterns (OIDC
     * RP-Initiated Logout `post_logout_redirect_uri`). Matched with the same
     * wildcard semantics as `redirectUri`.
     */
    postLogoutRedirectUri: string | null,

    grantTypes: string | null,

    scope: string | null,

    /**
     * Default redirect URL.
     */
    baseUrl: string | null,
    /**
     * URL prepended to relative URLs.
     */
    rootUrl: string | null,

    // ------------------------------------------------------------------

    createdAt: string,

    updatedAt: string,

    // ------------------------------------------------------------------

    realmId: Realm['id'],

    realm: Realm,

    accessPolicyId: Policy['id'] | null,

    accessPolicy: Policy | null,
}
