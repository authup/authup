/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import vuecs from '@vuecs/core';
import installOverlays from '@vuecs/overlays';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import type { App, Component } from 'vue';
import APermissionForm from '../../../../src/components/entities/permission/APermissionForm.vue';
import APolicyForm from '../../../../src/components/entities/policy/APolicyForm.vue';
import ARoleForm from '../../../../src/components/entities/role/ARoleForm.vue';
import AScopeForm from '../../../../src/components/entities/scope/AScopeForm.vue';
import { AFormSubmit } from '../../../../src/components/utility';
import { injectStore } from '../../../../src/core';
import { install } from '../../../../src/module';
import type { Options } from '../../../../src/types';

const REALM = { id: '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11', name: 'tenant' };
const MASTER_REALM = { id: '0f1e2d3c-4b5a-4968-8776-655443322110', name: 'master' };

const noop = () => undefined;

const collectionHandler = () => ({
    data: [],
    meta: {
        total: 0,
        limit: 10,
        offset: 0,
    },
});

const createHandler = (request: FakeRequest) => ({
    data: {
        id: '9a5c1d3e-2b4f-4a6c-8d7e-1f2a3b4c5d6e',
        ...(request.body as Record<string, any>),
    },
    meta: {},
});

type FormCase = {
    name: string,
    component: Component,
    path: string,
    props?: Record<string, any>,
    slots?: Record<string, string>,
};

const cases: FormCase[] = [
    {
        name: 'ARoleForm',
        component: ARoleForm,
        path: '/roles',
    },
    {
        name: 'AScopeForm',
        component: AScopeForm,
        path: '/scopes',
    },
    {
        name: 'APermissionForm',
        component: APermissionForm,
        path: '/permissions',
    },
    {
        name: 'APolicyForm',
        component: APolicyForm,
        path: '/policies',
        props: { type: BuiltInPolicyType.IDENTITY },
        // the type-specific sub-form is not what this spec is about
        slots: { default: '<div />' },
    },
];

function mountForm(
    entry: FormCase,
    realm: { id: string, name: string },
) {
    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            'GET /realms': collectionHandler,
            'GET /clients': collectionHandler,
            [`POST ${entry.path}`]: createHandler,
        },
    });

    const options : Options = {
        baseURL: 'http://fake.test',
        httpClient,
        pinia,
        isServer: true,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    };

    // runs after the kit install and before the form's setup, so the form
    // sees the realm the store would hold for a signed-in actor
    const seedRealm = {
        install(app: App) {
            const store = injectStore(pinia, app);
            store.realm = realm;
        },
    };

    const wrapper = mount(entry.component, {
        props: entry.props ?? {},
        slots: entry.slots,
        global: {
            components: { VCIcon: { render: () => null } },
            plugins: [
                pinia,
                [vuecs, {}],
                installOverlays,
                [{ install }, options],
                seedRealm,
            ],
        },
    });

    return { wrapper, httpClient };
}

function findCreateRequest(httpClient: FakeClient, path: string) : FakeRequest | undefined {
    return httpClient.requests.find(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname === path,
    );
}

async function submit(entry: FormCase, realm: { id: string, name: string }) {
    const { wrapper, httpClient } = mountForm(entry, realm);
    await flushPromises();

    wrapper.findComponent(AFormSubmit).vm.$emit('submit');
    await flushPromises();

    const request = findCreateRequest(httpClient, entry.path);
    wrapper.unmount();

    return request;
}

describe.each(cases)('$name realm on create', (entry) => {
    it('should send the realm of a realm-bound actor', async () => {
        const request = await submit(entry, REALM);

        expect(request).toBeDefined();
        expect(request!.body).toHaveProperty('realmId', REALM.id);
    });

    it('should send null for an untouched realm picker of a root actor', async () => {
        const request = await submit(entry, MASTER_REALM);

        expect(request).toBeDefined();
        expect(request!.body).toHaveProperty('realmId', null);
    });
});
