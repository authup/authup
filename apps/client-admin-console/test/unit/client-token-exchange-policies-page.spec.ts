/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionEvaluator } from '@authup/access';
import type { PermissionEvaluationContext } from '@authup/access';
import { AClientTokenExchangePolicyForm, AEntityDelete, AFormSubmit } from '@authup/client-web-kit';
import { PermissionName } from '@authup/core-kit';
import type { FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises } from '@vue/test-utils';
import type { RouteRecordRaw } from 'vue-router';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { defineComponent, h } from 'vue';
import { routes } from '../../src/router';
import { mountPage } from '../utils';

const CLIENT_ID = '3f5a1c2e-7d4b-4e8a-9c0f-1a2b3c4d5e6f';
const POLICY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const POLICIES_URL = `/clients/${CLIENT_ID}/token-exchange-policies`;

const Probe = defineComponent({ render: () => h('p', { class: 'probe' }, 'probe') });

// The real table, plus a neutral tab: the nav is what is under test there, and
// the policy tab would otherwise gate itself out of sight.
const testRoutes : RouteRecordRaw[] = routes.map((route) => {
    if (route.path === '/clients/:id') {
        return {
            ...route,
            children: [...(route.children || []), { path: 'probe', component: Probe }],
        } as RouteRecordRaw;
    }

    return route;
});

const policy = {
    id: POLICY_ID,
    audience: 'storage',
    capabilityTypes: 'bucket',
    maxLifetime: 600,
    subjectRealmScope: 'any',
    clientId: CLIENT_ID,
    realmId: '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

function allow(...names: string[]) {
    vi.spyOn(PermissionEvaluator.prototype, 'preEvaluateOneOf').mockImplementation(async (ctx: PermissionEvaluationContext) => {
        const requested = Array.isArray(ctx.name) ? ctx.name : [ctx.name];

        const denied = requested.every((name) => !names.includes(name));

        if (denied) {
            throw new Error('denied');
        }
    });
}

async function mountPolicies(path: string = POLICIES_URL) {
    const mounted = await mountPage(path, {
        [`GET /clients/${CLIENT_ID}`]: () => ({
            data: {
                id: CLIENT_ID,
                name: 'hub',
                displayName: null,
            },
            meta: {},
        }),
        'GET /client-token-exchange-policies': () => ({
            data: [policy],
            meta: {
                total: 1,
                limit: 10,
                offset: 0,
            },
        }),
        'POST /client-token-exchange-policies': (request: FakeRequest) => ({
            data: {
                ...policy,
                ...(request.body as Record<string, unknown>),
                id: 'b3b1f9e4-6e0c-4f31-8a0e-5a4f3c2d1e0f',
            },
            meta: {},
        }),
    }, testRoutes);

    await flushPromises();
    await flushPromises();

    return mounted;
}

function policyRequests(mounted: Awaited<ReturnType<typeof mountPolicies>>, method: string) {
    return mounted.httpClient.requests.filter(
        (request) => request.method === method &&
            new URL(request.url, 'http://localhost').pathname === '/client-token-exchange-policies',
    );
}

describe('src/pages/clients/[id]/token-exchange-policies.vue', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should hide the tab without any permission that reads the policies', async () => {
        allow(PermissionName.CLIENT_UPDATE);

        const { wrapper } = await mountPolicies(`/clients/${CLIENT_ID}/probe`);

        expect(wrapper.find('.probe').exists()).toBe(true);
        expect(wrapper.text()).not.toContain('Token exchange policies');

        wrapper.unmount();
    });

    it('should neither render nor load the policies without a permission that reads them', async () => {
        allow(PermissionName.CLIENT_UPDATE);

        const mounted = await mountPolicies();

        expect(mounted.wrapper.find('table').exists()).toBe(false);
        expect(policyRequests(mounted, 'GET')).toHaveLength(0);

        mounted.wrapper.unmount();
    });

    it('should show the tab and the policies with the read permission, without any write control', async () => {
        allow(PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_READ);

        const mounted = await mountPolicies();
        const { wrapper } = mounted;

        expect(wrapper.text()).toContain('Token exchange policies');
        expect(policyRequests(mounted, 'GET')).toHaveLength(1);
        expect(wrapper.find('table').text()).toContain('storage');
        expect(wrapper.find('table').text()).toContain('Every realm');

        expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('Add');
        expect(wrapper.findComponent(AEntityDelete).exists()).toBe(false);
        expect(wrapper.find('button[aria-label="Details"]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('should show the tab and the policies to a holder of the update permission alone', async () => {
        allow(PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE);

        const mounted = await mountPolicies();
        const { wrapper } = mounted;

        expect(wrapper.text()).toContain('Token exchange policies');
        expect(policyRequests(mounted, 'GET')).toHaveLength(1);
        expect(wrapper.find('table').text()).toContain('storage');
        expect(wrapper.find('button[aria-label="Details"]').exists()).toBe(true);
        expect(wrapper.findComponent(AEntityDelete).exists()).toBe(false);

        wrapper.unmount();
    });

    it('should close the edit form when the row being edited is deleted', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE,
            PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_DELETE,
        );

        const { wrapper } = await mountPolicies();

        await wrapper.find('button[aria-label="Details"]').trigger('click');
        await flushPromises();

        expect(wrapper.findComponent(AClientTokenExchangePolicyForm).exists()).toBe(true);

        wrapper.findComponent(AEntityDelete).vm.$emit('deleted', policy);
        await flushPromises();

        expect(wrapper.findComponent(AClientTokenExchangePolicyForm).exists()).toBe(false);
        expect(wrapper.find('table').text()).not.toContain('storage');

        wrapper.unmount();
    });

    it('should gate each write control on its own permission', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_READ,
            PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_DELETE,
        );

        const { wrapper } = await mountPolicies();

        expect(wrapper.findComponent(AEntityDelete).exists()).toBe(true);
        expect(wrapper.find('button[aria-label="Details"]').exists()).toBe(false);
        expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('Add');

        wrapper.unmount();
    });

    it('should create a policy through the form and list it', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_READ,
            PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_CREATE,
        );

        const mounted = await mountPolicies();
        const { wrapper } = mounted;

        await wrapper.findAll('button').find((button) => button.text() === 'Add')!.trigger('click');
        await flushPromises();

        expect(wrapper.findComponent(AClientTokenExchangePolicyForm).exists()).toBe(true);

        const [audience, capabilityTypes] = wrapper.findAll('input');

        await audience!.setValue('analysis');
        await capabilityTypes!.setValue('run');
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const [request] = policyRequests(mounted, 'POST');

        expect(request!.body).toMatchObject({
            clientId: CLIENT_ID,
            audience: 'analysis',
            capabilityTypes: 'run',
        });

        expect(wrapper.findComponent(AClientTokenExchangePolicyForm).exists()).toBe(false);
        expect(wrapper.find('table').text()).toContain('analysis');

        wrapper.unmount();
    });

    it('should open the form with the policy on edit', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_READ,
            PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE,
        );

        const { wrapper } = await mountPolicies();

        await wrapper.find('button[aria-label="Details"]').trigger('click');
        await flushPromises();

        const form = wrapper.findComponent(AClientTokenExchangePolicyForm);

        expect(form.props('entity')).toMatchObject({ id: POLICY_ID });

        wrapper.unmount();
    });
});
