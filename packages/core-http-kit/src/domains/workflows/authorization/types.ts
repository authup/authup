/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog } from '@authup/access';
import type { AuthorizationHeader } from 'hapic';

export type AuthorizationRequestOptions = {
    /**
     * Read the catalog with another credential than the client's own, the way
     * the kit store hands over the access token it is staging a session for.
     */
    authorizationHeader?: string | AuthorizationHeader,
};

export interface IAuthorizationAPI {
    /**
     * The identity-free permission catalog `GET /authorization` serves: every
     * definition with its policy trees. Cache it per process and refetch it
     * when the consumer reports it stale against the grants an introspection
     * carried.
     */
    get(options?: AuthorizationRequestOptions) : Promise<AuthorizationCatalog>;
}
