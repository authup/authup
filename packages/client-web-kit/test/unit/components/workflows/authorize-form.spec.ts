/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { OAuth2ErrorCode } from '@authup/specs';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import AuthorizeForm from '../../../../src/components/workflows/authorize/AuthorizeForm.vue';
import { install } from '../../../../src/module';
import type { Options } from '../../../../src/types';

const noop = () => undefined;

const codeRequest: OAuth2AuthorizationCodeRequest = {
    response_type: 'code',
    client_id: 'web',
    realm_id: 'realm-x',
    redirect_uri: 'https://app.example.com/cb',
    scope: 'global openid',
    state: 'state-1',
} as OAuth2AuthorizationCodeRequest;

// built_in → auto-consent fires the POST /authorize on mount.
const client = {
    id: 'client-1',
    name: 'web',
    display_name: 'Web',
    built_in: true,
    created_at: new Date(0).toISOString(),
} as Client;

function mountForm(authorizeHandler: () => unknown) {
    const pinia = createPinia();
    const httpClient = createFakeClient({ handlers: { 'POST /authorize': authorizeHandler } });

    const options: Options = {
        baseURL: 'http://fake.test',
        httpClient,
        pinia,
        isServer: true,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    };

    return mount(AuthorizeForm, {
        props: {
            client, 
            codeRequest, 
            scopes: [], 
        },
        global: {
            components: {
                VCIcon: { render: () => null },
                VCButton: { render: () => null },
            },
            stubs: {
                AuthorizeScopes: { template: '<div />' },
                ITranslateT: { template: '<span />' },
            },
            plugins: [
                pinia,
                [vuecs, {}],
                [{ install }, options],
            ],
        },
    });
}

// A hapic ClientError-shaped rejection.
const httpError = (status: number, data: Record<string, any> = {}) => {
    const error = new Error(`HTTP ${status}`);
    (error as unknown as { response: unknown }).response = { status, data };
    return error;
};

describe('AuthorizeForm dead-bearer resilience', () => {
    it('emits loginRequired on a 401 (dead/expired bearer)', async () => {
        const wrapper = mountForm(() => { throw httpError(401); });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeTruthy();
        // never fall through to the manual-consent retry loop
        expect(wrapper.find('.authorize-scopes').exists()).toBe(false);
    });

    it('emits loginRequired on a login_required body error', async () => {
        const wrapper = mountForm(() => {
            throw httpError(400, { error: OAuth2ErrorCode.LOGIN_REQUIRED });
        });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeTruthy();
    });

    it('does NOT emit loginRequired on an unrelated error (falls back to manual consent)', async () => {
        const wrapper = mountForm(() => { throw httpError(500); });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeFalsy();
    });
});
