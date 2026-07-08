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

function mountForm(silent: boolean) {
    const pinia = createPinia();
    const httpClient = createFakeClient({
        // a non-login_required failure (transient 500 / network blip)
        handlers: { 'POST /authorize': () => { throw new Error('boom'); } },
    });

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

describe('AuthorizeForm silent (prompt=none) failure', () => {
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
