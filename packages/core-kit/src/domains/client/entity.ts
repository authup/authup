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

    /**
     * OIDC Back-Channel Logout 1.0 endpoint: one absolute http(s) URL, no
     * patterns. Null means no logout token is pushed to this client.
     */
    backchannelLogoutUri: string | null,

    grantTypes: string | null,

    /**
     * The application's home URL, rendered as a link on the account
     * console's Applications page. http(s)-only is enforced at render time.
     */
    baseUrl: string | null,

    // ------------------------------------------------------------------

    createdAt: string,

    updatedAt: string,

    // ------------------------------------------------------------------

    realmId: Realm['id'],

    realm: Realm,

    accessPolicyId: Policy['id'] | null,

    accessPolicy: Policy | null,
}
