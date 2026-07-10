/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, OAuth2AuthorizationCodeRequest, Realm } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { OAuth2ErrorCode } from '@authup/specs';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
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

const now = new Date(0).toISOString();

const realm: Realm = {
    id: 'realm-x',
    name: 'master',
    display_name: null,
    description: null,
    built_in: true,
    created_at: now,
    updated_at: now,
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
    created_at: now,
    updated_at: now,
    realm_id: 'realm-x',
    realm,
};

type FormProps = {
    client?: Client,
    redirectUriVerified?: boolean,
};

function mountForm(authorizeHandler: () => unknown, props: FormProps = {}) {
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
            ...props,
        },
        global: {
            components: {
                VCIcon: { render: () => null },
                // clickable so the abort/authorize actions can be triggered
                VCButton: { template: '<button><slot /></button>' },
            },
            stubs: {
                // a distinctive class so the manual-consent screen (which renders
                // AuthorizeScopes) is detectable — the spinner does not render it.
                AuthorizeScopes: { template: '<div class="scopes-stub" />' },
                // ...same for the terminal aborted notice.
                AuthorizeText: { template: '<div class="aborted-stub" />' },
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
const httpError = (status: number, data: Record<string, any> = {}) => Object.assign(
    new Error(`HTTP ${status}`),
    { response: { status, data } },
);

describe('AuthorizeForm dead-bearer resilience', () => {
    it('emits loginRequired on a 401 (dead/expired bearer)', async () => {
        const wrapper = mountForm(() => { throw httpError(401); });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeTruthy();
        // never fall through to the manual-consent retry loop (AuthorizeScopes)
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
    });

    it('emits loginRequired on a login_required body error', async () => {
        const wrapper = mountForm(() => {
            throw httpError(400, { error: OAuth2ErrorCode.LOGIN_REQUIRED });
        });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeTruthy();
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
    });

    it('does NOT emit loginRequired on an unrelated error (falls back to manual consent)', async () => {
        const wrapper = mountForm(() => { throw httpError(500); });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeFalsy();
        // the manual-consent UI (with its scope list) renders as the retry path
        expect(wrapper.find('.scopes-stub').exists()).toBe(true);
    });

    it('does NOT emit loginRequired on a non-401 error carrying a different OAuth2 error code', async () => {
        // guards against a loose check that treats any body `error` field as
        // login_required — only the LOGIN_REQUIRED code (or a 401) qualifies.
        const wrapper = mountForm(() => {
            throw httpError(400, { error: OAuth2ErrorCode.INVALID_REQUEST });
        });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeFalsy();
        expect(wrapper.find('.scopes-stub').exists()).toBe(true);
    });

    it('emits loginRequired on a 401 even when the body carries an unrelated error code (status wins)', async () => {
        const wrapper = mountForm(() => {
            throw httpError(401, { error: OAuth2ErrorCode.INVALID_REQUEST });
        });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeTruthy();
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
    });

    it('does NOT emit loginRequired for a non-HTTP rejection (no response envelope)', async () => {
        // a directly-thrown/non-transport error (no `.response`) has no status
        // and no body `.error` — extractErrorContext yields both as undefined,
        // so it must fall back to manual consent, not re-authentication.
        const wrapper = mountForm(() => { throw new Error('boom'); });
        await flushPromises();

        expect(wrapper.emitted('loginRequired')).toBeFalsy();
        expect(wrapper.find('.scopes-stub').exists()).toBe(true);
    });
});

describe('AuthorizeForm abort redirect gate', () => {
    // non-built_in → no auto-consent; the manual consent UI (with the abort
    // action) renders immediately.
    const interactiveClient: Client = { ...client, built_in: false };

    beforeEach(() => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: '' },
        });
    });

    it('does NOT navigate on abort when the redirect_uri is unverified (open-redirect guard)', async () => {
        const wrapper = mountForm(() => ({}), {
            client: interactiveClient,
            redirectUriVerified: false,
        });
        await flushPromises();
        expect(wrapper.find('.scopes-stub').exists()).toBe(true);

        // the abort action is the first of the two consent buttons
        await wrapper.findAll('button')[0].trigger('click');
        await flushPromises();

        expect(window.location.href).toEqual('');
        // stays on the page: a terminal aborted notice replaces the consent UI
        expect(wrapper.find('.aborted-stub').exists()).toBe(true);
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
    });

    it('defaults to NOT navigating when redirectUriVerified is not passed (fail-closed)', async () => {
        const wrapper = mountForm(() => ({}), { client: interactiveClient });
        await flushPromises();

        await wrapper.findAll('button')[0].trigger('click');
        await flushPromises();

        expect(window.location.href).toEqual('');
        expect(wrapper.find('.aborted-stub').exists()).toBe(true);
    });

    it('redirects access_denied (+state) on abort when the redirect_uri is verified', async () => {
        const wrapper = mountForm(() => ({}), {
            client: interactiveClient,
            redirectUriVerified: true,
        });
        await flushPromises();

        await wrapper.findAll('button')[0].trigger('click');

        const url = new URL(window.location.href);
        expect(`${url.origin}${url.pathname}`).toEqual('https://app.example.com/cb');
        expect(url.searchParams.get('error')).toEqual('access_denied');
        expect(url.searchParams.get('state')).toEqual('state-1');
    });
});
