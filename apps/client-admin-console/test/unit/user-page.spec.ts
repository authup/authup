/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { routes } from '../../src/router';
import { mountPage } from '../utils';

const USER_ID = '0b5c8f3e-1d2a-4c6b-9e7f-8a9b0c1d2e3f';

const Probe = defineComponent({
    props: { entity: { type: Object, default: null } },
    render() {
        return h('p', { class: 'probe' }, this.entity ? this.entity.id : 'none');
    },
});

const Stub = defineComponent({ render: () => h('p', { class: 'stub' }, 'users') });

/** The real table, plus a probe tab under /users/:id and a stub /users. */
const testRoutes : RouteRecordRaw[] = routes.map((route) => {
    if (route.path === '/users/:id') {
        return {
            ...route,
            children: [...(route.children || []), { path: 'probe', component: Probe }],
        } as RouteRecordRaw;
    }

    if (route.path === '/users') {
        return { path: '/users', component: Stub };
    }

    return route;
});

describe('src/pages/users/[id].vue', () => {
    it('should render the record heading and hand the entity to the child tab', async () => {
        const { wrapper } = await mountPage(`/users/${USER_ID}/probe`, {
            [`GET /users/${USER_ID}`]: () => ({
                data: {
                    id: USER_ID,
                    name: 'alice',
                    displayName: 'Alice',
                },
                meta: {},
            }),
        }, testRoutes);

        expect(wrapper.find('h1').text()).toContain('Alice');
        expect(wrapper.find('.probe').text()).toEqual(USER_ID);
    });

    it('should land on /users when the record cannot be loaded', async () => {
        const { wrapper, router } = await mountPage(`/users/${USER_ID}`, {
            [`GET /users/${USER_ID}`]: () => {
                throw new Error('not found');
            },
        }, testRoutes);

        expect(router.currentRoute.value.path).toEqual('/users');
        expect(wrapper.find('.stub').exists()).toBe(true);
    });
});
