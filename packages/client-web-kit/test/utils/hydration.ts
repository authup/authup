/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HydrationStore } from '../../src';

export type FakeHydrationStore = {
    entries: Record<string, any>,
    store: HydrationStore
};

/**
 * Stand-in for a host's hydration payload: the same bucket the Nuxt plugin
 * and the server-core SSR app hand to `install()`.
 */
export function createFakeHydrationStore(initial: Record<string, any> = {}) : FakeHydrationStore {
    const entries : Record<string, any> = { ...initial };

    return {
        entries,
        store: {
            get: <T>(key: string) => entries[key] as T | undefined,
            set: (key: string, value: unknown) => {
                entries[key] = value;
            },
            delete: (key: string) => {
                delete entries[key];
            },
        },
    };
}
