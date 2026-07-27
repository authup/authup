/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import AIdentityProviderBasicFields from '../../../../../src/components/entities/identity-provider/AIdentityProviderBasicFields.vue';
import AIdentityProviderOAuth2Form from '../../../../../src/components/entities/identity-provider/AIdentityProviderOAuth2Form.vue';
import { AFormInputList, ANameInput } from '../../../../../src/components/utility';
import { install } from '../../../../../src/module';
import type { Options } from '../../../../../src/types';

const noop = () => undefined;

function createEntity() : IdentityProvider {
    return {
        id: 'f0b1e948-4e69-4b7e-9f0c-1a2b3c4d5e6f',
        name: 'old-name',
        displayName: null,
        protocol: IdentityProviderProtocol.OAUTH2,
        preset: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        realmId: 'realm-1',
        realm: {
            id: 'realm-1',
            name: 'master',
            displayName: null,
            description: null,
            builtIn: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        },
        // oauth2 extra attributes (EA) as returned by the API
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tokenUrl: 'https://idp.example.com/oauth/token',
        authorizeUrl: 'https://idp.example.com/oauth/authorize',
        scope: 'openid profile',
    } as IdentityProvider;
}

function mountComponent(component: any, entity: IdentityProvider) {
    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            'POST /identity-providers/:id': (request: FakeRequest) => ({
                data: {
                    ...entity,
                    ...(request.body as Record<string, any>),
                    updatedAt: '2026-01-02T00:00:00.000Z',
                },
                meta: {},
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

    const wrapper = mount(component, {
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

function mountForm(entity: IdentityProvider) {
    return mountComponent(AIdentityProviderOAuth2Form, entity);
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
        expect(body).not.toHaveProperty('createdAt');
        expect(body).not.toHaveProperty('updatedAt');
    });

    it('should submit with an empty scope (blank optional emitted as null)', async () => {
        const entity = createEntity();
        delete (entity as Partial<OAuth2IdentityProvider>).scope;

        const { wrapper, httpClient } = mountForm(entity);

        await flushPromises();

        await wrapper.find('form').trigger('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect((request!.body as Record<string, any>).scope ?? null).toBeNull();
    });

    it('should hydrate the scope list and submit a changed scope on update', async () => {
        const entity = createEntity();
        const { wrapper, httpClient } = mountForm(entity);

        await flushPromises();

        // one list input per scope token
        const scopeList = wrapper.findComponent(AFormInputList);
        expect(scopeList.exists()).toBe(true);

        const inputValues = wrapper
            .findAll('input')
            .map((i) => (i.element as HTMLInputElement).value);
        expect(inputValues).toContain('openid');
        expect(inputValues).toContain('profile');

        scopeList.vm.$emit('changed', ['openid', 'profile', 'custom']);
        await flushPromises();

        await wrapper.find('form').trigger('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({ scope: 'openid profile custom' });
    });
});

describe('AIdentityProviderBasicFields', () => {
    it('should preserve an unsaved edit across an entity refresh and release it once persisted', async () => {
        const entity = createEntity();
        const { wrapper } = mountComponent(AIdentityProviderBasicFields, entity);

        await flushPromises();

        const nameInput = wrapper.findComponent(ANameInput);
        const inputValues = () => wrapper
            .findAll('input')
            .map((i) => (i.element as HTMLInputElement).value);

        expect(nameInput.props('modelValue')).toEqual('old-name');

        // user edits the name (dirty), but does not submit
        nameInput.vm.$emit('update:modelValue', 'new-name');
        await flushPromises();

        // external refresh: another session changed displayName
        await wrapper.setProps({
            entity: {
                ...entity,
                displayName: 'Renamed',
                updatedAt: '2026-01-03T00:00:00.000Z',
            },
        });
        await flushPromises();

        // the unsaved name edit survives, the clean field syncs
        expect(nameInput.props('modelValue')).toEqual('new-name');
        expect(inputValues()).toContain('Renamed');

        // the entity catches up with the edit (own save persisted it)
        await wrapper.setProps({
            entity: {
                ...entity,
                name: 'new-name',
                displayName: 'Renamed',
                updatedAt: '2026-01-04T00:00:00.000Z',
            },
        });
        await flushPromises();

        expect(nameInput.props('modelValue')).toEqual('new-name');

        // a later refresh now flows again — the edit protection is released
        await wrapper.setProps({
            entity: {
                ...entity,
                name: 'third-name',
                displayName: 'Renamed',
                updatedAt: '2026-01-05T00:00:00.000Z',
            },
        });
        await flushPromises();

        expect(nameInput.props('modelValue')).toEqual('third-name');
    });
});
