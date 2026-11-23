/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, onMounted } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { useRoute } from 'vue-router';
import DefaultLayout from '../../src/layouts/default.vue';
import { routes } from '../../src/router.ts';
import { mountPage } from '../utils/index.ts';

const ROLE_A = '0b5c8f3e-1d2a-4c6b-9e7f-8a9b0c1d2e3a';
const ROLE_B = '0b5c8f3e-1d2a-4c6b-9e7f-8a9b0c1d2e3b';

function buildRole(id: string, name: string) {
    return {
        data: {
            id,
            name,
            displayName: name,
        },
        meta: {},
    };
}

const STUBS = {
    PageHeader: true,
    PageSidebar: true,
    PageFooter: true,
};

describe('src/layouts/default.vue', () => {
    it('should load the other record when only the id changes', async () => {
        const {
            wrapper,
            router,
            httpClient,
        } = await mountPage(`/roles/${ROLE_A}`, {
            [`GET /roles/${ROLE_A}`]: () => buildRole(ROLE_A, 'alpha'),
            [`GET /roles/${ROLE_B}`]: () => buildRole(ROLE_B, 'beta'),
        }, routes, { root: DefaultLayout, stubs: STUBS });

        expect(wrapper.find('h1').text()).toContain('alpha');

        await router.push(`/roles/${ROLE_B}`);
        await flushPromises();

        expect(wrapper.find('h1').text()).toContain('beta');
        expect(httpClient.requests.some((request) => request.url?.includes(ROLE_B))).toBe(true);
    });

    it('should keep the page instance on a query-only change', async () => {
        let mounts = 0;

        const Probe = defineComponent({
            setup() {
                const route = useRoute();

                onMounted(() => {
                    mounts++;
                });

                return () => h('p', { class: 'probe' }, String(route.query.page ?? ''));
            },
        });

        const testRoutes : RouteRecordRaw[] = [{ path: '/probe/:id', component: Probe }];

        const { wrapper, router } = await mountPage('/probe/a', {}, testRoutes, { root: DefaultLayout, stubs: STUBS });

        await router.push('/probe/a?page=2');
        await flushPromises();

        expect(wrapper.find('.probe').text()).toEqual('2');
        expect(mounts).toEqual(1);

        await router.push('/probe/b');
        await flushPromises();

        expect(mounts).toEqual(2);
    });
});
