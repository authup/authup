/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import AClientForm from '../../../../../src/components/entities/client/AClientForm.vue';
import { AFormSubmit } from '../../../../../src/components/utility';
import { install } from '../../../../../src/module';
import type { Options } from '../../../../../src/types';

const noop = () => undefined;

const now = '2026-01-01T00:00:00.000Z';

function createEntity() : Client {
    return {
        id: 'f0b1e948-4e69-4b7e-9f0c-1a2b3c4d5e6f',
        active: true,
        built_in: false,
        is_confidential: true,
        name: 'my-app',
        display_name: null,
        description: null,
        secret: 'known-secret',
        secret_hashed: false,
        secret_encrypted: false,
        redirect_uri: 'https://app.example.com/cb',
        post_logout_redirect_uri: null,
        grant_types: null,
        scope: null,
        base_url: null,
        root_url: null,
        access_policy_id: '9c7a1f4e-0d2b-4a6c-8e1f-3b5d7a9c0e2f',
        access_policy: null,
        created_at: now,
        updated_at: now,
        realm_id: 'realm-1',
        realm: {
            id: 'realm-1',
            name: 'master',
            display_name: null,
            description: null,
            built_in: true,
            created_at: now,
            updated_at: now,
        },
    };
}

function mountForm(entity: Client) {
    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            'POST /clients/:id': (request: FakeRequest) => ({
                ...entity,
                ...(request.body as Record<string, any>),
                updated_at: '2026-01-02T00:00:00.000Z',
            }),
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

    const wrapper = mount(AClientForm, {
        props: { entity },
        global: {
            components: { VCIcon: { render: () => null } },
            stubs: {
                // pickers are entity collections (network-backed) — stub them,
                // declaring the props so hydration/scoping is assertable.
                APolicyPicker: {
                    name: 'APolicyPicker',
                    props: ['value', 'query'],
                    template: '<div class="policy-picker-stub" />',
                },
                ARealmPicker: { template: '<div class="realm-picker-stub" />' },
                ANameInput: {
                    props: ['modelValue', 'disabled'],
                    template: '<input class="name-input-stub" />',
                },
                ASecretInput: {
                    props: ['modelValue', 'disabled'],
                    template: '<input class="secret-input-stub" />',
                },
                // @vuecs/forms components resolve globally in the consumer app;
                // stub them here (the kit deliberately does not install forms).
                VCFormGroup: { template: '<div><slot name="label" /><slot /><slot name="hint" /></div>' },
                VCFormInput: {
                    props: ['modelValue', 'disabled'],
                    template: '<input />',
                },
                VCFormTextarea: {
                    props: ['modelValue'],
                    template: '<textarea />',
                },
                VCFormSwitch: {
                    props: ['modelValue', 'label', 'labelContent'],
                    template: '<input type="checkbox" />',
                },
            },
            plugins: [
                pinia,
                [vuecs, {}],
                [{ install }, options],
            ],
        },
    });

    return { wrapper, httpClient };
}

function findUpdateRequest(httpClient: FakeClient) : FakeRequest | undefined {
    return httpClient.requests.find(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname.startsWith('/clients/'),
    );
}

describe('AClientForm access policy', () => {
    it('renders the access-policy picker hydrated from the entity and realm-scoped (incl. global)', async () => {
        const entity = createEntity();
        const { wrapper } = mountForm(entity);
        await flushPromises();

        const picker = wrapper.findComponent({ name: 'APolicyPicker' });
        expect(picker.exists()).toBe(true);
        expect(picker.props('value')).toEqual(entity.access_policy_id);
        expect(picker.props('query')).toEqual({ filters: { realm_id: ['realm-1', null] } });
    });

    it('submits a changed access_policy_id on update', async () => {
        const entity = createEntity();
        const { wrapper, httpClient } = mountForm(entity);
        await flushPromises();

        const picker = wrapper.findComponent({ name: 'APolicyPicker' });
        picker.vm.$emit('change', ['1b2c3d4e-5f60-4172-8394-a5b6c7d8e9f0']);
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({ access_policy_id: '1b2c3d4e-5f60-4172-8394-a5b6c7d8e9f0' });
    });

    it('submits null when the picker selection is cleared', async () => {
        const entity = createEntity();
        const { wrapper, httpClient } = mountForm(entity);
        await flushPromises();

        const picker = wrapper.findComponent({ name: 'APolicyPicker' });
        picker.vm.$emit('change', []);
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toHaveProperty('access_policy_id', null);
    });
});
