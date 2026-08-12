/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import installOverlays from '@vuecs/overlays';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import type { Router } from 'vue-router';
import { createMemoryHistory, createRouter } from 'vue-router';
import AContentAction from '../../../../src/components/utility/content-action/AContentAction.vue';
import { install } from '../../../../src/module';

const noop = () => undefined;

const OVERVIEW_URL = '/roles';
const ADD_URL = '/roles/add';
// A second list route under the same section. The button must NOT follow the
// prefix, only the two exact routes it was given.
const SIBLING_URL = '/roles/queue';

type MountResult = {
    wrapper: VueWrapper<any>,
    router: Router,
};

async function mountContentAction(
    path: string,
    props: Record<string, any> = {},
) : Promise<MountResult> {
    const pinia = createPinia();
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: OVERVIEW_URL, component: { template: '<div />' } },
            { path: ADD_URL, component: { template: '<div />' } },
            { path: SIBLING_URL, component: { template: '<div />' } },
        ],
    });

    await router.push(path);
    await router.isReady();

    const wrapper = mount(AContentAction, {
        props: {
            overviewUrl: OVERVIEW_URL,
            addUrl: ADD_URL,
            ...props,
        },
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

    return { wrapper, router };
}

describe('AContentAction', () => {
    it('renders the add action on the overview route', async () => {
        const { wrapper } = await mountContentAction(OVERVIEW_URL);

        const link = wrapper.find('a');

        expect(link.exists()).toBeTruthy();
        expect(link.attributes('href')).toEqual(ADD_URL);
        expect(wrapper.text()).toEqual('Add');
    });

    it('renders the back action on the add route', async () => {
        const { wrapper } = await mountContentAction(ADD_URL);

        const link = wrapper.find('a');

        expect(link.exists()).toBeTruthy();
        expect(link.attributes('href')).toEqual(OVERVIEW_URL);
        expect(wrapper.text()).toEqual('Back');
    });

    // Load bearing: a section may carry more list routes than the overview,
    // and none of them may inherit the title-row action.
    it('renders nothing on a route that is neither overview nor add', async () => {
        const { wrapper } = await mountContentAction(SIBLING_URL);

        expect(wrapper.find('a').exists()).toBeFalsy();
        expect(wrapper.find('button').exists()).toBeFalsy();
        expect(wrapper.text()).toEqual('');
    });

    it('normalizes a trailing slash on the supplied urls', async () => {
        const { wrapper } = await mountContentAction(OVERVIEW_URL, {
            overviewUrl: `${OVERVIEW_URL}/`,
            addUrl: `${ADD_URL}/`,
        });

        expect(wrapper.text()).toEqual('Add');
    });

    // vue-router keeps a trailing slash on `route.path`, so the active route
    // needs normalizing as well as the props.
    it('normalizes a trailing slash on the active route', async () => {
        const { wrapper } = await mountContentAction(`${ADD_URL}/`);

        expect(wrapper.text()).toEqual('Back');
    });

    it('lets an enabled add action navigate', async () => {
        const { wrapper, router } = await mountContentAction(OVERVIEW_URL);

        await wrapper.find('a').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toEqual(ADD_URL);
    });

    // The control above proves the click DOES navigate when enabled, so this
    // asserts the guard itself and not just an inert markup attribute.
    it('blocks navigation for a disabled add action', async () => {
        const { wrapper, router } = await mountContentAction(OVERVIEW_URL, { addDisabled: true });

        const link = wrapper.find('a');

        expect(link.attributes('aria-disabled')).toEqual('true');
        expect(link.attributes('tabindex')).toEqual('-1');

        await link.trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toEqual(OVERVIEW_URL);
    });
});
