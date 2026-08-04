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
// Pinned here because a rename or typo on that prop fails silently: the
// tabs would simply stop carrying the ref.
//
// Select tabs by `:not(--back)`: the back entry leads the strip and shares
// the nav-link class, but it points off-site and carries no ref query.
const TABS = '.a-account-shell-nav-link:not(.a-account-shell-nav-link--back)';
describe('AAccountShell nav query threading', () => {
    it('nav hrefs carry the ref query', async () => {
        const wrapper = await mountWithRouter({
            items: buildItems({ ref: REF }),
            backLink: REF,
        });

        const hrefs = wrapper.findAll(TABS).map((l) => l.attributes('href'));

        expect(hrefs).toHaveLength(2);
        expect(hrefs[0]).toBeDefined();
        expect(hrefs[0]).toContain('ref=');
        expect(hrefs[1]).toContain('ref=');

        // The back entry itself points off-site and must NOT gain the query.
        const back = wrapper.find('.a-account-shell-nav-link--back');
        expect(back.attributes('href')).toEqual(REF);
    });

    it('nav hrefs omit the ref query when none is active', async () => {
        const wrapper = await mountWithRouter({ items: buildItems(undefined) });

        const hrefs = wrapper.findAll(TABS).map((l) => l.attributes('href'));

        expect(hrefs[0]).toBeDefined();
        expect(hrefs[0]).not.toContain('ref=');
    });
});
