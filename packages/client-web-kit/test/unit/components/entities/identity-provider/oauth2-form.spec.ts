/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import AIdentityProviderOAuth2Form from '../../../../../src/components/entities/identity-provider/AIdentityProviderOAuth2Form.vue';
import { ANameInput } from '../../../../../src/components/utility';
import { install } from '../../../../../src/module';
import type { Options } from '../../../../../src/types';

const noop = () => undefined;

function createEntity() : IdentityProvider {
    return {
        id: 'f0b1e948-4e69-4b7e-9f0c-1a2b3c4d5e6f',
        name: 'old-name',
        display_name: null,
        protocol: IdentityProviderProtocol.OAUTH2,
        preset: null,
        enabled: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        realm_id: 'realm-1',
        realm: {
            id: 'realm-1',
            name: 'master',
            display_name: null,
            description: null,
            built_in: true,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
        },
        // oauth2 extra attributes (EA) as returned by the API
        client_id: 'client-id',
        client_secret: 'client-secret',
        token_url: 'https://idp.example.com/oauth/token',
        authorize_url: 'https://idp.example.com/oauth/authorize',
    } as IdentityProvider;
}

function mountForm(entity: IdentityProvider) {
    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            'POST /identity-providers/:id': (request: FakeRequest) => ({
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

    const wrapper = mount(AIdentityProviderOAuth2Form, {
        props: { entity },
        global: {
            components: { VCIcon: { render: () => null } },
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
            new URL(request.url, 'http://localhost').pathname.startsWith('/identity-providers/'),
    );
}

describe('AIdentityProviderOAuth2Form', () => {
    it('should submit a changed name on update', async () => {
        const entity = createEntity();
        const { wrapper, httpClient } = mountForm(entity);

        await flushPromises();

        const nameInput = wrapper.findComponent(ANameInput);
        expect(nameInput.exists()).toBe(true);
        expect(nameInput.props('modelValue')).toEqual('old-name');

        nameInput.vm.$emit('update:modelValue', 'new-name');
        await flushPromises();

        await wrapper.find('form').trigger('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({ name: 'new-name' });

        // sub-form states must not leak unrelated entity properties into
        // the payload (a stale `name` copied into the client/endpoint
        // sub-forms previously clobbered the edited one on spread).
        const body = request!.body as Record<string, any>;
        expect(body).not.toHaveProperty('id');
        expect(body).not.toHaveProperty('realm');
        expect(body).not.toHaveProperty('created_at');
        expect(body).not.toHaveProperty('updated_at');
    });
});
