/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { defineQuery } from '@rapiq/core';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { install as installForms } from '@vuecs/forms';
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
        builtIn: false,
        authMethod: 'secret',
        tokenBindingMethod: 'none',
        name: 'my-app',
        displayName: null,
        description: null,
        secret: 'known-secret',
        secretHashed: false,
        secretEncrypted: false,
        redirectUri: 'https://app.example.com/cb',
        postLogoutRedirectUri: null,
        backchannelLogoutUri: null,
        grantTypes: null,
        baseUrl: null,
        accessPolicyId: '9c7a1f4e-0d2b-4a6c-8e1f-3b5d7a9c0e2f',
        accessPolicy: null,
        createdAt: now,
        updatedAt: now,
        realmId: 'realm-1',
        realm: {
            id: 'realm-1',
            name: 'master',
            displayName: null,
            description: null,
            builtIn: true,
            createdAt: now,
            updatedAt: now,
        },
    };
}

function mountForm(entity: Client) {
    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            'POST /clients/:id': (request: FakeRequest) => ({
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
                    name: 'VCFormInput',
                    props: ['modelValue', 'disabled'],
                    template: '<input />',
                },
                VCFormTextarea: {
                    props: ['modelValue'],
                    template: '<textarea />',
                },
                VCFormSwitch: {
                    props: ['modelValue', 'label', 'labelContent', 'disabled'],
                    template: '<input type="checkbox" />',
                },
                VCFormSelect: {
                    props: ['modelValue', 'options'],
                    template: '<select />',
                },
                VCFormCheckboxGroup: {
                    name: 'VCFormCheckboxGroup',
                    props: ['modelValue'],
                    template: '<div class="checkbox-group-stub"><slot /></div>',
                },
                VCFormCheckbox: {
                    name: 'VCFormCheckbox',
                    props: ['value', 'label', 'labelContent'],
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
        expect(picker.props('value')).toEqual(entity.accessPolicyId);
        expect(picker.props('query')).toEqual(defineQuery({ filters: { realmId: ['realm-1', null] } }));
    });

    it('submits a changed accessPolicyId on update', async () => {
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
        expect(request!.body).toMatchObject({ accessPolicyId: '1b2c3d4e-5f60-4172-8394-a5b6c7d8e9f0' });
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
        expect(request!.body).toHaveProperty('accessPolicyId', null);
    });
});

// Both url lists are initialised to `''` like every other optional string on
// this form, and `submit()` posts the raw form state. What makes that safe is
// the transport: `ClientAPI.create/update/put` run the payload through
// `nullifyEmptyObjectProperties`, so `''` reaches the server as `null`. That
// matters because the server validator applies `z.url()` per comma-separated
// segment and rejects `''` outright (`''.split(',')` -> `['']`). Pinned here
// because the `''` initialiser reads unsafe without knowing about the nullify
// step, and dropping that step would 400 every client created without a
// redirect uri.
describe('AClientForm untouched url lists', () => {
    it('submits null for both url lists when neither is touched', async () => {
        const pinia = createPinia();
        const httpClient = createFakeClient({
            handlers: {
                'POST /clients': (request: FakeRequest) => ({
                    data: { ...(request.body as Record<string, any>), id: 'new-id' },
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

        const wrapper = mount(AClientForm, {
            global: {
                components: { VCIcon: { render: () => null } },
                stubs: {
                    APolicyPicker: { template: '<div />' },
                    ARealmPicker: { template: '<div />' },
                    ANameInput: { props: ['modelValue', 'disabled'], template: '<input />' },
                    ASecretInput: { props: ['modelValue', 'disabled'], template: '<input />' },
                    VCFormGroup: { template: '<div><slot /></div>' },
                    VCFormInput: { props: ['modelValue', 'disabled'], template: '<input />' },
                    VCFormTextarea: { props: ['modelValue'], template: '<textarea />' },
                    VCFormSwitch: { props: ['modelValue', 'label', 'labelContent'], template: '<input type="checkbox" />' },
                    VCFormSelect: { props: ['modelValue', 'options'], template: '<select />' },
                    VCFormCheckboxGroup: {
                        name: 'VCFormCheckboxGroup', 
                        props: ['modelValue'], 
                        template: '<div><slot /></div>', 
                    },
                    VCFormCheckbox: {
                        name: 'VCFormCheckbox', 
                        props: ['value', 'label', 'labelContent'], 
                        template: '<input type="checkbox" />', 
                    },
                },
                plugins: [pinia, [vuecs, {}], [{ install }, options]],
            },
        });

        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = httpClient.requests.find(
            (candidate) => candidate.method === 'POST' &&
                new URL(candidate.url, 'http://localhost').pathname === '/clients',
        );
        expect(request).toBeDefined();
        expect(request!.body).toHaveProperty('redirectUri', null);
        expect(request!.body).toHaveProperty('postLogoutRedirectUri', null);
    });
});

describe('AClientForm post-logout redirect uris', () => {
    // The list is keyed by label, so target it by index: redirect URIs first,
    // post-logout second.
    const findList = (wrapper: ReturnType<typeof mountForm>['wrapper']) => wrapper
        .findAllComponents({ name: 'AFormInputList' })[1]!;

    it('hydrates from the comma-separated column, independently of redirectUri', async () => {
        const entity = createEntity();
        entity.postLogoutRedirectUri = 'https://app.example.com/bye,https://alt.example.com/**';

        const { wrapper } = mountForm(entity);
        await flushPromises();

        expect(findList(wrapper).props('names')).toEqual([
            'https://app.example.com/bye',
            'https://alt.example.com/**',
        ]);
        // the login redirect list must not pick the post-logout value up
        expect(wrapper.findAllComponents({ name: 'AFormInputList' })[0]!.props('names'))
            .toEqual(['https://app.example.com/cb']);
    });

    it('submits the patterns comma-joined', async () => {
        const { wrapper, httpClient } = mountForm(createEntity());
        await flushPromises();

        findList(wrapper).vm.$emit('changed', [
            'https://app.example.com/bye',
            'https://alt.example.com/**',
        ]);
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({ postLogoutRedirectUri: 'https://app.example.com/bye,https://alt.example.com/**' });
    });

    it('submits null when every pattern is removed', async () => {
        const entity = createEntity();
        entity.postLogoutRedirectUri = 'https://app.example.com/bye';

        const { wrapper, httpClient } = mountForm(entity);
        await flushPromises();

        findList(wrapper).vm.$emit('changed', []);
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toHaveProperty('postLogoutRedirectUri', null);
    });
});

// A checked box has to actually show a checkmark. It once did not: the glyph
// lived only in `@vuecs/forms`' base stylesheet, which the tailwind theme stack
// does not load, so a checked box rendered as a solid square (tada5hi/vuecs#1694,
// fixed in @vuecs/forms 5.4.0 by moving the glyph into the component). The glyph
// now comes from the component itself, and this guards that it stays visible.
describe('AClientForm checkbox indicator', () => {
    it('renders a glyph in the checked box and nothing in the unchecked ones', async () => {
        const entity = createEntity();
        entity.grantTypes = 'authorization_code';

        const pinia = createPinia();
        const options : Options = {
            baseURL: 'http://fake.test',
            httpClient: createFakeClient({ handlers: {} }),
            pinia,
            isServer: true,
            cookieGet: noop,
            cookieSet: noop,
            cookieUnset: noop,
        };

        const wrapper = mount(AClientForm, {
            props: { entity },
            global: {
                stubs: {
                    APolicyPicker: { template: '<div />' },
                    ARealmPicker: { template: '<div />' },
                },
                plugins: [
                    pinia,
                    [vuecs, {}],
                    { install: installForms },
                    [{ install }, options],
                ],
            },
        });

        await flushPromises();

        const boxes = wrapper.findAll('[role="checkbox"]');
        const checked = boxes.filter((box) => box.attributes('data-state') === 'checked');
        const unchecked = boxes.filter((box) => box.attributes('data-state') === 'unchecked');

        expect(checked).toHaveLength(1);
        expect(unchecked.length).toBeGreaterThan(0);

        // a real drawn glyph, not just an empty indicator element
        expect(checked[0]!.element.innerHTML).toContain('<svg');
        expect(checked[0]!.element.innerHTML).toContain('<path');

        for (const box of unchecked) {
            expect(box.element.innerHTML).not.toContain('<svg');
        }
    });
});

describe('AClientForm grant types', () => {
    const findGroup = (wrapper: ReturnType<typeof mountForm>['wrapper']) => wrapper
        .findComponent({ name: 'VCFormCheckboxGroup' });

    it('offers every supported grant type as an option', async () => {
        const { wrapper } = mountForm(createEntity());
        await flushPromises();

        const values = wrapper
            .findAllComponents({ name: 'VCFormCheckbox' })
            .map((checkbox) => checkbox.props('value'));

        expect(values).toEqual([
            'authorization_code',
            'client_credentials',
            'password',
            'refresh_token',
        ]);
    });

    it('hydrates the selection from the delimited column', async () => {
        const entity = createEntity();
        entity.grantTypes = 'authorization_code refresh_token';

        const { wrapper } = mountForm(entity);
        await flushPromises();

        expect(findGroup(wrapper).props('modelValue')).toEqual([
            'authorization_code',
            'refresh_token',
        ]);
    });

    it('keeps an unknown grant type as a checked option instead of stripping it', async () => {
        const entity = createEntity();
        entity.grantTypes = 'authorization_code,urn:ietf:params:oauth:grant-type:device_code';

        const { wrapper } = mountForm(entity);
        await flushPromises();

        expect(findGroup(wrapper).props('modelValue')).toContain(
            'urn:ietf:params:oauth:grant-type:device_code',
        );
        expect(
            wrapper
                .findAllComponents({ name: 'VCFormCheckbox' })
                .map((checkbox) => checkbox.props('value')),
        ).toContain('urn:ietf:params:oauth:grant-type:device_code');
    });

    it('submits the selection as a space-delimited allowlist', async () => {
        const { wrapper, httpClient } = mountForm(createEntity());
        await flushPromises();

        findGroup(wrapper).vm.$emit('update:modelValue', ['authorization_code', 'refresh_token']);
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({ grantTypes: 'authorization_code refresh_token' });
    });

    // An empty column means allow-all server-side, so clearing the selection
    // must send null — an empty string would also fail the validator's min(3).
    it('submits null when the selection is cleared', async () => {
        const entity = createEntity();
        entity.grantTypes = 'authorization_code';

        const { wrapper, httpClient } = mountForm(entity);
        await flushPromises();

        findGroup(wrapper).vm.$emit('update:modelValue', []);
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toHaveProperty('grantTypes', null);
    });
});

// Both are plain text inputs bound like `displayName`: the entity value
// hydrates the input, a typed value is submitted as is, and a cleared input
// reaches the server as null (the kit's validup treats `''` as missing and
// the transport nullifies it).
describe('AClientForm home and back-channel logout urls', () => {
    const findInput = (wrapper: ReturnType<typeof mountForm>['wrapper'], value: string) => wrapper
        .findAllComponents({ name: 'VCFormInput' })
        .find((input) => input.props('modelValue') === value);

    it.each([
        ['baseUrl', 'https://app.example.com', 'https://app.example.com/home'],
        ['backchannelLogoutUri', 'https://app.example.com/logout', 'https://app.example.com/backchannel'],
    ] as const)('hydrates %s from the entity and submits the typed value', async (key, initial, next) => {
        const entity = createEntity();
        entity[key] = initial;

        const { wrapper, httpClient } = mountForm(entity);
        await flushPromises();

        const input = findInput(wrapper, initial);
        expect(input).toBeDefined();

        input!.vm.$emit('update:modelValue', next);
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({ [key]: next });
    });

    it.each([
        ['baseUrl', 'https://app.example.com'],
        ['backchannelLogoutUri', 'https://app.example.com/logout'],
    ] as const)('submits null for %s when the input is cleared', async (key, initial) => {
        const entity = createEntity();
        entity[key] = initial;

        const { wrapper, httpClient } = mountForm(entity);
        await flushPromises();

        const input = findInput(wrapper, initial);
        expect(input).toBeDefined();

        input!.vm.$emit('update:modelValue', '');
        await flushPromises();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        const request = findUpdateRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toHaveProperty(key, null);
    });
});
