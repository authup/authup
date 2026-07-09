/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type { FakeHandler } from '@authup/core-http-kit/testing';
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
};

// built_in → auto-consent fires the POST /authorize on mount.
const client: Client = {
    id: 'client-1',
    active: true,
    built_in: true,
    is_confidential: false,
    name: 'web',
    display_name: 'Web',
    description: null,
    secret: null,
    secret_hashed: false,
    secret_encrypted: false,
    redirect_uri: null,
    post_logout_redirect_uri: null,
    grant_types: null,
    scope: null,
    base_url: null,
    root_url: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    realm_id: 'realm-x',
    realm: {
        id: 'realm-x',
        name: 'master',
        display_name: null,
        description: null,
        built_in: true,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
    },
};

// a non-login_required failure (transient 500 / network blip)
const failHandler: FakeHandler = () => { throw new Error('boom'); };

function mountForm(silent: boolean, authorizeHandler: FakeHandler = failHandler) {
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
            silent, 
        },
        global: {
            components: {
                VCIcon: { render: () => null },
                VCButton: { render: () => null },
            },
            stubs: {
                AuthorizeScopes: { template: '<div class="scopes-stub" />' },
                ITranslateT: { template: '<span />' },
            },
            plugins: [pinia, [vuecs, {}], [{ install }, options]],
        },
    });
}

describe('AuthorizeForm silent (prompt=none)', () => {
    beforeEach(() => {
        // auto-consent success assigns window.location.href — keep it inspectable.
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: '' },
        });
    });

    it('auto-consents silently and redirects to the code URL (success)', async () => {
        // built_in + prompt=none + a valid session → the auto-consent POST
        // succeeds and the browser navigates to the returned redirect (with the
        // code) — zero interactive UI, the silent-success contract.
        const codeUrl = 'https://app.example.com/cb?code=abc123&state=state-1';
        const wrapper = mountForm(true, () => ({ url: codeUrl }));
        await flushPromises();

        expect(window.location.href).toEqual(codeUrl);
        expect(wrapper.emitted('failed')).toBeFalsy();
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
    });

    it('emits failed (no interactive UI) when silent and auto-consent fails', async () => {
        const wrapper = mountForm(true);
        await flushPromises();

        // the parent redirects an OIDC error; the form must NOT render the
        // interactive manual-consent screen (its scope list / buttons)
        expect(wrapper.emitted('failed')).toBeTruthy();
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
    });

    it('falls back to interactive manual consent when NOT silent', async () => {
        const wrapper = mountForm(false);
        await flushPromises();

        // non-silent: the manual-consent UI renders (retry path), no failed emit
        expect(wrapper.emitted('failed')).toBeFalsy();
        expect(wrapper.find('.scopes-stub').exists()).toBe(true);
    });
});
