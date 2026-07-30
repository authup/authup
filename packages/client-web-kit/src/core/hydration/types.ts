/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Bucket for values produced during the server render and replayed by the
 * hydrating client, so a request answered on the server is not repeated in
 * the browser.
 *
 * The kit only reads and writes entries. Transport and serialization belong
 * to the host: Nuxt backs it with `payload.data`, the server-core SSR app
 * with its window payload. Without a store the kit skips server-side loads
 * entirely, because their result could not reach the client anyway.
 */
export type HydrationStore = {
    get<T>(key: string) : T | undefined,
    set(key: string, value: unknown) : void,
    delete(key: string) : void
};

export type HydratedValueContext<T> = {
    /** Request identity. Both sides must derive it identically. */
    key: string,
    /** Resolve the value during the server render. */
    resolve: () => Promise<T | undefined>,
    /** Adopt a resolved value, on either side of the boundary. */
    apply: (value: T) => void
};
