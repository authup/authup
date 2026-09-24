/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { install } from '@authup/client-web-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeHandlerMap } from '@authup/core-http-kit/testing';
import vuecs from '@vuecs/core';
import installNavigation from '@vuecs/navigation';
import installOverlays from '@vuecs/overlays';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { Suspense, defineComponent, h } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';
import { routes as appRoutes } from '../../src/router';

const noop = () => undefined;

/**
 * Mount the page a path resolves to, behind a memory-history router over the
 * real route table. No routing guard and no layout: the page, its
 * `<Suspense>` boundary and its child routes are what is under test.
 *
 * ponytail: installs only what the /users/:id specs need; a page reaching
 * another global component needs its plugin added here.
 */
export async function mountPage(
    path: string,
    handlers: FakeHandlerMap = {},
    routes: RouteRecordRaw[] = appRoutes,
) {
    const pinia = createPinia();
    const httpClient = createFakeClient({ handlers });
    const router = createRouter({ history: createMemoryHistory(), routes });

    await router.push(path);

    const wrapper = mount(defineComponent({ render: () => h(Suspense, null, { default: () => h(RouterView) }) }), {
        global: {
            // iconify would fetch every icon it has no data for
            stubs: { VCIcon: true },
            plugins: [
                pinia,
                router,
                [vuecs, {}],
                installOverlays,
                installNavigation,
                [{ install }, {
                    baseURL: 'http://fake.test',
                    httpClient,
                    pinia,
                    isServer: true,
                    cookieGet: noop,
                    cookieSet: noop,
                    cookieUnset: noop,
                }],
            ],
        },
    });

    await flushPromises();

    return {
        wrapper,
        router,
        httpClient,
    };
}
