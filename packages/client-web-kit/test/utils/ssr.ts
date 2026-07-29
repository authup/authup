/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeHandlerMap } from '@authup/core-http-kit/testing';
import { renderToString } from '@vue/server-renderer';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import type { Component } from 'vue';
import { createSSRApp, h } from 'vue';
import { install } from '../../src/module';
import type { Options } from '../../src/types';

const noop = () => undefined;

/**
 * Render a kit component the way a host's server render does. There is no
 * DOM, so the spec file needs the node environment.
 */
export async function renderKitComponent(
    component: Component,
    props: Record<string, any> = {},
    handlers: FakeHandlerMap = {},
    overrides: Partial<Options> = {},
) {
    const pinia = createPinia();
    const httpClient = createFakeClient({ handlers });

    const app = createSSRApp({ render: () => h(component, props) });

    const options : Options = {
        baseURL: 'http://fake.test',
        httpClient,
        pinia,
        isServer: true,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
        ...overrides,
    };

    app.use(pinia);
    app.use(vuecs, {});
    app.use({ install }, options);

    const html = await renderToString(app);

    return {
        html,
        httpClient,
    };
}
