/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { provideIlingo } from '@ilingo/vue';
import { Ilingo, throwSyncUnavailable } from 'ilingo';
import type { IStore } from 'ilingo';
import type { Component } from 'vue';
import { defineComponent, h } from 'vue';

export const ASYNC_ONLY_TRANSLATION = 'Async name';

/**
 * Store that holds the value but refuses to produce it without I/O, the way
 * a cold `FSStore`, an unloaded `LoaderStore` pair or a remote adapter does.
 * Its `getSync` declines, so `@ilingo/vue` cannot seed the first render from
 * it and the translation only arrives once the async lookup settles.
 */
function createAsyncOnlyStore() : IStore {
    const id = Symbol('AsyncOnlyStore');

    return {
        id,
        get: async () => ASYNC_ONLY_TRANSLATION,
        getSync: (context) => throwSyncUnavailable(context, id),
        getLocales: async () => ['en'],
    };
}

/**
 * Render `child` against an ilingo instance backed by that store. Provided at
 * component level, so it shadows the `MemoryStore` instance the kit installs
 * for the descendants only.
 */
export function withAsyncOnlyTranslator(child: Component) : Component {
    return defineComponent({
        setup() {
            provideIlingo(new Ilingo({ store: createAsyncOnlyStore() }));

            return () => h(child);
        },
    });
}
