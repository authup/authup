/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';

export interface Client {
    id: string,

    // ------------------------------------------------------------------

    active: boolean;

    built_in: boolean;

    is_confidential: boolean,

    // ------------------------------------------------------------------

    name: string,

    display_name: string | null;

    description: string | null,

    // ------------------------------------------------------------------

    secret: string | null,

    secret_hashed: boolean,

    secret_encrypted: boolean,

    // ------------------------------------------------------------------

    redirect_uri: string | null,

    grant_types: string | null,

    scope: string | null,

    /**
     * Default redirect URL.
     */
    base_url: string | null,
    /**
     * URL prepended to relative URLs.
     */
    root_url: string | null,

    // ------------------------------------------------------------------

    created_at: string,

    updated_at: string,

    // ------------------------------------------------------------------

    realm_id: Realm['id'],

    realm: Realm,
}
