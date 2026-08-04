/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import { mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import installOverlays from '@vuecs/overlays';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import AAccountShell from '../../../../src/components/utility/AAccountShell.vue';
import type { AAccountShellNavItem } from '../../../../src/components/utility/types';
import { install } from '../../../../src/module';

const noop = () => undefined;
const REF = 'http://localhost:3000/';

// The EXACT nav-item shape apps/client-account-console/src/pages/index.vue
// builds, mounted WITH a vue-router present, as the real app has.
function buildItems(query?: Record<string, string>) : AAccountShellNavItem[] {
    return [
        {
            key: 'overview', 
            label: 'Overview', 
            link: { to: '/', query }, 
            active: true,
        },
        {
            key: 'password', 
            label: 'Password', 
            link: { to: '/password', query },
        },
    ];
}

async function mountWithRouter(props: Record<string, any>) {
    const pinia = createPinia();
    const router = createRouter({
        history: createMemoryHistory('/account'),
        routes: [
            { path: '/', component: { template: '<div />' } },
            { path: '/password', component: { template: '<div />' } },
        ],
    });

    router.push('/');
    await router.isReady();

    const wrapper = mount(AAccountShell, {
        props,
        global: {
            components: { VCIcon: { render: () => null } },
            plugins: [
                pinia,
                router,
                [vuecs, {}],
                installOverlays,
                [{ install }, {
                    baseURL: 'http://fake.test',
                    httpClient: createFakeClient({ handlers: {} }),
                    pinia,
                    isServer: true,
                    cookieGet: noop,
                    cookieSet: noop,
                    cookieUnset: noop,
                }],
            ],
        },
    });

    return wrapper;
}

// The account console builds nav entries as `link: { to, query }` and relies
// on <VCLink>'s `query` prop to put the back-link ref onto every tab href.
// `LinkProperties` has an index signature, so that contract is invisible to
// the type checker: it has to be pinned here.
describe('AAccountShell nav query threading', () => {
    it('nav hrefs carry the ref query', async () => {
        const wrapper = await mountWithRouter({
            items: buildItems({ ref: REF }),
            backLink: REF,
        });

        const hrefs = wrapper.findAll('.a-account-shell-nav-link').map((l) => l.attributes('href'));

        expect(hrefs[0]).toBeDefined();
        expect(hrefs[0]).toContain('ref=');
        expect(hrefs[1]).toContain('ref=');
    });

    it('nav hrefs omit the ref query when none is active', async () => {
        const wrapper = await mountWithRouter({ items: buildItems(undefined) });

        const hrefs = wrapper.findAll('.a-account-shell-nav-link').map((l) => l.attributes('href'));

        expect(hrefs[0]).toBeDefined();
        expect(hrefs[0]).not.toContain('ref=');
    });
});
