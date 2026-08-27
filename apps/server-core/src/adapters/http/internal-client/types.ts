/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type InternalHttpClientContext = {
    /**
     * The public base URL (config `publicUrl`) — stays the client's
     * `baseURL` so URLs derived from it remain user-facing.
     */
    publicURL: string,
    /**
     * The server's own listen address (e.g. http://localhost:3010/) —
     * where the transport actually dispatches requests.
     */
    internalURL: string,
};
