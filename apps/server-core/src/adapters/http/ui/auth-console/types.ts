/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HydrationPayload } from '@authup/client-auth-console';
import type { StatusResponseFeatures } from '@authup/core-http-kit';

export type UIRenderContext = {
    url: string,
    payload: HydrationPayload,
};

export type ServeWorkflowPageOptions = {
    url: string,
    baseURL: string,
    features: StatusResponseFeatures,
    // Whether the page consumes the `realmId` (legacy `realm_id`) / `token`
    // query params (e.g. prefill from an email deep link). Off by default so
    // a page never reflects a param it doesn't use.
    realmAware?: boolean,
    tokenAware?: boolean,
};

export type InternalUIHttpClientContext = {
    /**
     * The public base URL (config `publicUrl`) — stays the client's
     * `baseURL` so URLs rendered into the HTML remain user-facing.
     */
    publicURL: string,
    /**
     * The server's own listen address (e.g. http://localhost:3010/) —
     * where the transport actually dispatches requests.
     */
    internalURL: string,
};
