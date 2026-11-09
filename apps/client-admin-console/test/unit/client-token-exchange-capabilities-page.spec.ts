/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionEvaluator } from '@authup/access';
import type { PermissionEvaluationContext } from '@authup/access';
import { AClientTokenExchangeCapabilityForm, AEntityDelete, AFormSubmit } from '@authup/client-web-kit';
import { PermissionName } from '@authup/core-kit';
import type { FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises } from '@vue/test-utils';
import { VCButton } from '@vuecs/button';
import { VCModalContent } from '@vuecs/overlays';
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
const CAPABILITY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const CAPABILITIES_URL = `/clients/${CLIENT_ID}/token-exchange-capabilities`;

const Probe = defineComponent({ render: () => h('p', { class: 'probe' }, 'probe') });

// The real table, plus a neutral tab: the nav is what is under test there, and
// the capability tab would otherwise gate itself out of sight.
const testRoutes : RouteRecordRaw[] = routes.map((route) => {
    if (route.path === '/clients/:id') {
        return {
            ...route,
            children: [...(route.children || []), { path: 'probe', component: Probe }],
        } as RouteRecordRaw;
    }

    return route;
});

const capability = {
    id: CAPABILITY_ID,
    audience: 'storage',
    value: 'bucket',
    maxAge: 600,
    realmScope: 'any',
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

async function mountCapabilities(path: string = CAPABILITIES_URL) {
    const mounted = await mountPage(path, {
        [`GET /clients/${CLIENT_ID}`]: () => ({
            data: {
                id: CLIENT_ID,
                name: 'hub',
                displayName: null,
            },
            meta: {},
        }),
        'GET /client-token-exchange-capabilities': () => ({
            data: [capability],
            meta: {
                total: 1,
                limit: 10,
                offset: 0,
            },
        }),
        'POST /client-token-exchange-capabilities': (request: FakeRequest) => ({
            data: {
                ...capability,
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

function capabilityRequests(mounted: Awaited<ReturnType<typeof mountCapabilities>>, method: string) {
    return mounted.httpClient.requests.filter(
        (request) => request.method === method &&
            new URL(request.url, 'http://localhost').pathname === '/client-token-exchange-capabilities',
    );
}

describe('src/pages/clients/[id]/token-exchange-capabilities.vue', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should hide the tab without any permission that reads the capabilities', async () => {
        allow(PermissionName.CLIENT_UPDATE);

        const { wrapper } = await mountCapabilities(`/clients/${CLIENT_ID}/probe`);

        expect(wrapper.find('.probe').exists()).toBe(true);
        expect(wrapper.text()).not.toContain('Token exchange capabilities');

        wrapper.unmount();
    });

    it('should neither render nor load the capabilities without a permission that reads them', async () => {
        allow(PermissionName.CLIENT_UPDATE);

        const mounted = await mountCapabilities();

        expect(mounted.wrapper.find('table').exists()).toBe(false);
        expect(capabilityRequests(mounted, 'GET')).toHaveLength(0);

        mounted.wrapper.unmount();
    });

    it('should show the tab and the capabilities with the read permission, without any write control', async () => {
        allow(PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_READ);

        const mounted = await mountCapabilities();
        const { wrapper } = mounted;

        expect(wrapper.text()).toContain('Token exchange capabilities');
        expect(capabilityRequests(mounted, 'GET')).toHaveLength(1);
        expect(wrapper.find('table').text()).toContain('storage');
        expect(wrapper.find('table').text()).toContain('Every realm');

        expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('Add');
        expect(wrapper.findComponent(AEntityDelete).exists()).toBe(false);
        expect(wrapper.find('button[aria-label="Details"]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('should show the tab and the capabilities to a holder of the update permission alone', async () => {
        allow(PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE);

        const mounted = await mountCapabilities();
        const { wrapper } = mounted;

        expect(wrapper.text()).toContain('Token exchange capabilities');
        expect(capabilityRequests(mounted, 'GET')).toHaveLength(1);
        expect(wrapper.find('table').text()).toContain('storage');
        expect(wrapper.find('button[aria-label="Details"]').exists()).toBe(true);
        expect(wrapper.findComponent(AEntityDelete).exists()).toBe(false);

        wrapper.unmount();
    });

    it('should close the form when the row being edited is deleted', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE,
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_DELETE,
        );

        const { wrapper } = await mountCapabilities();

        await wrapper.find('button[aria-label="Details"]').trigger('click');
        await flushPromises();

        expect(wrapper.findComponent(AClientTokenExchangeCapabilityForm).exists()).toBe(true);

        wrapper.findComponent(AEntityDelete).vm.$emit('deleted', capability);
        await flushPromises();

        expect(wrapper.findComponent(AClientTokenExchangeCapabilityForm).exists()).toBe(false);
        expect(wrapper.find('table').text()).not.toContain('storage');

        wrapper.unmount();
    });

    it('should keep the form closed until asked and close it again on abort', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_READ,
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_CREATE,
        );

        const { wrapper } = await mountCapabilities();

        expect(wrapper.findComponent(AClientTokenExchangeCapabilityForm).exists()).toBe(false);

        await wrapper.findAll('button').find((button) => button.text() === 'Add')!.trigger('click');
        await flushPromises();

        expect(wrapper.findComponent(VCModalContent).findComponent(AClientTokenExchangeCapabilityForm).exists()).toBe(true);

        // next to the submit button, inside the form's action row
        await wrapper
            .findComponent(AClientTokenExchangeCapabilityForm)
            .findAllComponents(VCButton)
            .find((button) => button.text() === 'Abort')!
            .trigger('click');
        await flushPromises();

        expect(wrapper.findComponent(AClientTokenExchangeCapabilityForm).exists()).toBe(false);
        expect(wrapper.find('table').text()).toContain('storage');

        wrapper.unmount();
    });

    it('should gate each write control on its own permission', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_READ,
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_DELETE,
        );

        const { wrapper } = await mountCapabilities();

        expect(wrapper.findComponent(AEntityDelete).exists()).toBe(true);
        expect(wrapper.find('button[aria-label="Details"]').exists()).toBe(false);
        expect(wrapper.findAll('button').map((button) => button.text())).not.toContain('Add');

        wrapper.unmount();
    });

    it('should create a capability through the form and list it', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_READ,
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_CREATE,
        );

        const mounted = await mountCapabilities();
        const { wrapper } = mounted;

        await wrapper.findAll('button').find((button) => button.text() === 'Add')!.trigger('click');
        await flushPromises();

        const form = wrapper.findComponent(AClientTokenExchangeCapabilityForm);

        expect(form.exists()).toBe(true);

        const [audience, value] = form.findAll('input');

        await audience!.setValue('analysis');
        await value!.setValue('run');
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const [request] = capabilityRequests(mounted, 'POST');

        expect(request!.body).toMatchObject({
            clientId: CLIENT_ID,
            audience: 'analysis',
            value: 'run',
        });

        expect(wrapper.findComponent(AClientTokenExchangeCapabilityForm).exists()).toBe(false);
        expect(wrapper.find('table').text()).toContain('analysis');

        wrapper.unmount();
    });

    it('should open the form with the capability on edit', async () => {
        allow(
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_READ,
            PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE,
        );

        const { wrapper } = await mountCapabilities();

        await wrapper.find('button[aria-label="Details"]').trigger('click');
        await flushPromises();

        const form = wrapper.findComponent(AClientTokenExchangeCapabilityForm);

        expect(form.props('entity')).toMatchObject({ id: CAPABILITY_ID });

        wrapper.unmount();
    });
});
