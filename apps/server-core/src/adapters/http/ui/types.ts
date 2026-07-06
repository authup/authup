/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type UIRenderContext = {
    url: string,
    payload: {
        config: Record<string, any>,
        data: Record<string, any>,
    },
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
