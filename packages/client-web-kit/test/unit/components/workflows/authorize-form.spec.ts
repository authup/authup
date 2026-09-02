/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, OAuth2AuthorizationCodeRequest, Realm } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { OAuth2AuthorizationPrompt, OAuth2ErrorCode } from '@authup/specs';
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
    displayName: null,
    description: null,
    builtIn: true,
    createdAt: now,
    updatedAt: now,
};

// built_in → auto-consent fires the POST /authorize on mount.
const client: Client = {
    id: 'client-1',
    active: true,
    builtIn: true,
    authMethod: 'none',
    tokenBindingMethod: 'none',
    name: 'web',
    displayName: 'Web',
    description: null,
    secret: null,
    secretHashed: false,
    secretEncrypted: false,
    redirectUri: null,
    postLogoutRedirectUri: null,
    backchannelLogoutUri: null,
    grantTypes: null,
    baseUrl: null,
    createdAt: now,
    updatedAt: now,
    realmId: 'realm-x',
    realm,
    accessPolicyId: null,
    accessPolicy: null,
};

type FormProps = {
    client?: Client,
    redirectUriVerified?: boolean,
    consentGranted?: boolean,
    codeRequest?: OAuth2AuthorizationCodeRequest,
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
                // ...same for the terminal notices — the class discriminates the
                // access-policy denial card (is-error) from the aborted notice.
                AuthorizeText: {
                    props: ['isError', 'message'],
                    template: '<div :class="isError ? \'denied-stub\' : \'aborted-stub\'" />',
                },
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
    const interactiveClient: Client = { ...client, builtIn: false };

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

describe('AuthorizeForm persisted-consent auto-consent (plan 055)', () => {
    // non-built_in → auto-consent may only ride the consentGranted prop
    const interactiveClient: Client = { ...client, builtIn: false };

    it('auto-submits POST /authorize when consentGranted and no prompt=consent', async () => {
        let authorizeCalls = 0;
        const wrapper = mountForm(() => { authorizeCalls += 1; return {}; }, {
            client: interactiveClient,
            consentGranted: true,
        });
        await flushPromises();

        expect(authorizeCalls).toBe(1);
        // no manual consent screen — the covered request skipped it
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
    });

    it('keeps the manual consent screen when prompt=consent forces re-approval', async () => {
        let authorizeCalls = 0;
        const wrapper = mountForm(() => { authorizeCalls += 1; return {}; }, {
            client: interactiveClient,
            consentGranted: true,
            codeRequest: {
                ...codeRequest,
                prompt: OAuth2AuthorizationPrompt.CONSENT,
            },
        });
        await flushPromises();

        // prompt=consent always re-prompts — union/keep happens server-side
        expect(authorizeCalls).toBe(0);
        expect(wrapper.find('.scopes-stub').exists()).toBe(true);
    });

    it('does NOT auto-submit for a non-built_in client without consentGranted', async () => {
        let authorizeCalls = 0;
        const wrapper = mountForm(() => { authorizeCalls += 1; return {}; }, { client: interactiveClient });
        await flushPromises();

        expect(authorizeCalls).toBe(0);
        expect(wrapper.find('.scopes-stub').exists()).toBe(true);
    });
});

describe('AuthorizeForm access-policy denial', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: '' },
        });
    });

    it('renders the terminal denial card on an access_denied body error (unverified redirect)', async () => {
        const wrapper = mountForm(() => {
            throw httpError(400, {
                code: OAuth2ErrorCode.ACCESS_DENIED,
                error: OAuth2ErrorCode.ACCESS_DENIED,
            });
        });
        await flushPromises();

        expect(wrapper.find('.denied-stub').exists()).toBe(true);
        // no consent UI, no retry action, no navigation, no re-auth fallback
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
        expect(wrapper.findAll('button')).toHaveLength(0);
        expect(window.location.href).toEqual('');
        expect(wrapper.emitted('loginRequired')).toBeFalsy();
    });

    it('does NOT render the denial card for an unrelated 400 error (falls back to manual consent)', async () => {
        const wrapper = mountForm(() => {
            throw httpError(400, { error: OAuth2ErrorCode.INVALID_REQUEST });
        });
        await flushPromises();

        expect(wrapper.find('.denied-stub').exists()).toBe(false);
        expect(wrapper.find('.scopes-stub').exists()).toBe(true);
    });

    it('navigates the server-built error redirect on a verified denial (200 { url })', async () => {
        const deniedUrl = 'https://app.example.com/cb?error=access_denied&state=state-1';
        const wrapper = mountForm(() => ({ url: deniedUrl }));
        await flushPromises();

        expect(window.location.href).toEqual(deniedUrl);
        expect(wrapper.find('.denied-stub').exists()).toBe(false);
        expect(wrapper.find('.scopes-stub').exists()).toBe(false);
    });
});
