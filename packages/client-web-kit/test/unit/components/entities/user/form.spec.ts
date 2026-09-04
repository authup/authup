/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import AUserForm from '../../../../../src/components/entities/user/AUserForm.vue';
import { AFormSubmit } from '../../../../../src/components/utility';
import { install } from '../../../../../src/module';
import type { Options } from '../../../../../src/types';

const noop = () => undefined;

const now = '2026-01-01T00:00:00.000Z';

function createEntity() : User {
    return {
        id: 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
        name: 'jane',
        nameLocked: false,
        firstName: null,
        lastName: null,
        displayName: 'Jane',
        email: 'jane@example.com',
        emailVerified: true,
        password: null,
        avatar: null,
        cover: null,
        resetHash: null,
        resetAt: null,
        resetExpires: null,
        status: null,
        statusMessage: null,
        active: true,
        activateHash: null,
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

function mountForm(entity: User, canManage: boolean) {
    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            'POST /users/:id': (request: FakeRequest) => ({
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

    const wrapper = mount(AUserForm, {
        props: {
            entity,
            canManage,
        },
        global: {
            components: { VCIcon: { render: () => null } },
            stubs: {
                // the realm picker is an entity collection (network-backed)
                ARealms: { template: '<div class="realms-stub" />' },
                AToggleButton: { template: '<div />' },
                ANameInput: {
                    props: ['modelValue', 'disabled'],
                    template: '<input class="name-input-stub" />',
                },
                // @vuecs/forms components resolve globally in the consumer app;
                // stub them here (the kit deliberately does not install forms).
                VCFormGroup: { template: '<div><slot name="label" /><slot /></div>' },
                VCFormInput: {
                    props: ['modelValue', 'disabled'],
                    template: '<input />',
                },
                VCFormSwitch: {
                    props: ['modelValue', 'label'],
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
            new URL(request.url, 'http://localhost').pathname.startsWith('/users/'),
    );
}

async function submit(entity: User, canManage: boolean) {
    const { wrapper, httpClient } = mountForm(entity, canManage);
    await flushPromises();

    wrapper.findComponent(AFormSubmit).vm.$emit('submit');
    await flushPromises();

    const request = findUpdateRequest(httpClient);
    expect(request).toBeDefined();

    return request!.body as Record<string, any>;
}

// The admin-only keys are gated on the payload, not only in the template: a
// self-edit is evaluated against `system.user-names-self-manage`, an inverted
// ATTRIBUTE_NAMES policy that denies on key PRESENCE rather than on a changed
// value, so posting them at their unchanged values rejected every account
// console profile save.
describe('AUserForm admin-only fields', () => {
    it('omits them from the payload when the actor can not manage the user', async () => {
        const body = await submit(createEntity(), false);

        expect(body).not.toHaveProperty('active');
        expect(body).not.toHaveProperty('nameLocked');
        expect(body).not.toHaveProperty('emailVerified');

        // the self-editable fields still ride along
        expect(body).toMatchObject({
            name: 'jane',
            displayName: 'Jane',
            email: 'jane@example.com',
        });
    });

    it('submits them when the actor can manage the user', async () => {
        const body = await submit(createEntity(), true);

        expect(body).toHaveProperty('active', true);
        expect(body).toHaveProperty('nameLocked', false);
        expect(body).toHaveProperty('emailVerified', true);
    });
});
