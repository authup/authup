/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientManager } from '@authup/core-realtime-kit';
import type { Pinia } from 'pinia';
import type { App } from 'vue';
import { ref, unref } from 'vue';
import { injectStoreFactory, storeToRefs } from '../store';
import { provideSocketManager } from './singleton';

export type SocketManagerInstallOptions = {
    pinia?: Pinia,
    baseURL: string
};

export function installSocketManager(app: App, options: SocketManagerInstallOptions) {
    const storeCreator = injectStoreFactory(app);
    const store = storeCreator(options.pinia);
    const { accessToken } = storeToRefs(store);

    // `unref()` collapses the Pinia 3 / Vue 3.5 double-ref-wrap that
    // `storeToRefs` started returning after the foundation commit's
    // package bumps. Runtime behaviour is unchanged; the cast just
    // realigns TypeScript's view with what Pinia's proxy already
    // unwraps. Same pattern applies to `state.accessToken` inside the
    // $subscribe handler below.
    const manager = new ClientManager({
        url: options.baseURL,
        token: () => (unref(accessToken.value) as string | null) ?? undefined,
    });

    const oldValue = ref<string | undefined>();

    store.$subscribe((
        mutation,
        state,
    ) => {
        const normalizedToken = (unref((state as { accessToken: unknown }).accessToken) as string | null) ?? undefined;
        if (normalizedToken !== oldValue.value) {
            oldValue.value = normalizedToken;

            Promise.resolve()
                .then(() => manager.reconnect());
        }
    });

    provideSocketManager(manager, app);
}
