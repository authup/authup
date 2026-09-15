/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog } from '@authup/access';

export interface IAuthorizationAPI {
    /**
     * The identity-free permission catalog `GET /authorization` serves: every
     * definition with its policy trees, plus every tree a grant can name.
     *
     * It takes no options because the route is ANONYMOUS and the document
     * depends on no caller: the same bytes answer everyone, which is what makes
     * one cached copy reusable across every identity the consumer later
     * introspects. A public client holds no credential of its own, so a gate
     * here would have made this unusable for exactly its main consumer.
     *
     * Cache it per process and refetch it when the consumer reports it stale
     * against the grants an introspection carried.
     */
    get() : Promise<AuthorizationCatalog>;
}
