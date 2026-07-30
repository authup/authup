/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

export type HydrationPayload<T extends Record<string, any> = Record<string, any>> = {
    config: {
        baseURL?: string,
        [key: string]: any
    },
    data: T,
    /**
     * Results the kit produced during the server render, keyed by request
     * identity. Filled while rendering (the payload is serialized afterwards)
     * and consumed once by the hydrating client.
     */
    hydration?: Record<string, any>
};
