/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, 
    Consent, 
    OAuth2AuthorizationCodeRequest, 
    User,
} from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { OAuth2AuthorizationPrompt } from '@authup/specs';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type { App } from 'vue';
import AAccountPrompt from '../../../../src/components/workflows/authorize/AAccountPrompt.vue';
import AAuthorize from '../../../../src/components/workflows/authorize/Authorize.vue';
import AuthorizeForm from '../../../../src/components/workflows/authorize/AuthorizeForm.vue';
import AuthorizeSilentRedirect from '../../../../src/components/workflows/authorize/AuthorizeSilentRedirect.vue';
import {
    StoreAuthOrigin,
    injectStore,
} from '../../../../src/core';
import type { Store } from '../../../../src/core';
import { install } from '../../../../src/module';
import type { Options } from '../../../../src/types';

const noop = () => undefined;
const REALM = { id: 'realm-x', name: 'master' };

// A logged-in, fully-resolved store — the state in which prompt=select_account
// would render the chooser (mimics a lingering session restored from cookies).
// `withUser: false` mimics a lingering NON-user (client/robot) session, or a
// cookie-restored one whose userinfo fetch failed: loggedIn/realm are set from
// token introspection, but the user never resolves.
function seedLoggedIn(store: Store, realmId = REALM.id, withUser = true) {
    store.setAccessToken('access-token');
    store.setRealm({ id: realmId, name: REALM.name });

    if (!withUser) {
        return;
    }

    const now = new Date(0).toISOString();
    const user: User = {
        id: 'user-1',
        name: 'jdoe',
        nameLocked: false,
        firstName: null,
        lastName: null,
        displayName: null,
        email: 'jdoe@example.com',
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
        realmId,
        realm: {
            id: realmId,
            name: REALM.name,
            displayName: null,
            description: null,
            builtIn: false,
            createdAt: now,
            updatedAt: now,
        },
    };
    store.setUser(user);
}

// Per-scope consent rows for the covering probe (plan 055) — one row per
// lowercase scope token, mirroring the server's persisted shape.
function consentRow(scope: string, expiresAt: string | null = null): Consent {
    const now = new Date(0).toISOString();
    return {
        id: `consent-${scope}`,
        clientId: 'client-1',
        realmId: REALM.id,
        userId: 'user-1',
        sub: 'user-1',
        subKind: 'user',
        scope,
        expiresAt,
        createdAt: now,
        updatedAt: now,
    };
}

type MountOverrides = {
    prompt?: string,
    clientBuiltIn?: boolean,
    loggedIn?: boolean,
    withUser?: boolean,
    realmId?: string,
    redirectUriVerified?: boolean,
    consentRows?: Consent[],
    consentHandler?: () => unknown,
};

function mountAuthorize(overrides: MountOverrides = {}) {
    const {
        prompt = OAuth2AuthorizationPrompt.SELECT_ACCOUNT,
        clientBuiltIn = false,
        loggedIn = true,
        withUser = true,
        realmId = REALM.id,
        redirectUriVerified = true,
        consentRows,
        consentHandler,
    } = overrides;

    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            // a user-less session's re-resolve attempt must settle by failing —
            // the default fallback would otherwise fake a truthy "user".
            'GET /users/@me': () => { throw new Error('userinfo unavailable'); },
            // covering probe: no override → the fallback's empty collection
            // (no persisted consent → covered=false, today's behavior).
            ...(consentHandler ?
                { 'GET /consents': consentHandler } :
                {}),
            ...(consentRows && !consentHandler ?
                { 'GET /consents': () => ({ data: consentRows, meta: { total: consentRows.length } }) } :
                {}),
        },
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

    const codeRequest: OAuth2AuthorizationCodeRequest = {
        response_type: 'code',
        client_id: 'web',
        realm_id: REALM.id,
        redirect_uri: 'https://app.example.com/cb',
        scope: 'global openid',
        state: 'state-1',
        code_challenge: 'challenge',
        code_challenge_method: 'S256',
        prompt,
    };

    const clientTimestamp = new Date(0).toISOString();
    const client: Client = {
        id: 'client-1',
        active: true,
        builtIn: clientBuiltIn,
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
        grantTypes: null,
        scope: null,
        baseUrl: null,
        rootUrl: null,
        createdAt: clientTimestamp,
        updatedAt: clientTimestamp,
        realmId: REALM.id,
        realm: {
            id: REALM.id,
            name: REALM.name,
            displayName: null,
            description: null,
            builtIn: false,
            createdAt: clientTimestamp,
            updatedAt: clientTimestamp,
        },
    };

    let store!: Store;

    const wrapper = mount(AAuthorize, {
        props: {
            codeRequest,
            client,
            realm: {
                id: REALM.id,
                name: REALM.name,
                displayName: 'Master',
            },
            scopes: [],
            redirectUriVerified,
        },
        global: {
            components: {
                VCIcon: { render: () => null },
                VCButton: { render: () => null },
            },
            // Stub the branch children we don't assert on — avoids AuthorizeForm's
            // scope fetch (aborted at teardown → noisy happy-dom warning).
            stubs: {
                AuthorizeForm: {
                    // declare the props we assert on so findComponent(...).props()
                    // reflects them (a bare template stub drops them to attrs).
                    props: ['silent', 'redirectUriVerified', 'consentGranted'],
                    emits: ['loginRequired'],
                    template: '<div class="authorize-form-stub" />',
                },
                LoginForm: { template: '<div class="login-form-stub" />' },
                // keep AuthorizeSilentRedirect real so we can assert its props,
                // but stub its child so onMounted's window.location is a no-op.
                // Render the message so loading-state texts are assertable.
                AuthorizeText: {
                    props: ['message', 'isError'],
                    template: '<div class="authorize-text-stub">{{ message }}</div>',
                },
            },
            plugins: [
                pinia,
                [vuecs, {}],
                [{ install }, options],
                {
                    install(app: App) {
                        store = injectStore(pinia, app);
                        if (loggedIn) {
                            seedLoggedIn(store, realmId, withUser);
                        }
                    },
                },
            ],
        },
    });

    return {
        wrapper, 
        store: () => store, 
        httpClient, 
    };
}

const hasChooser = (wrapper: ReturnType<typeof mountAuthorize>['wrapper']) => wrapper.findComponent(AAccountPrompt).exists();
const silentRedirect = (wrapper: ReturnType<typeof mountAuthorize>['wrapper']) => wrapper.findComponent(AuthorizeSilentRedirect);
const authorizeForm = (wrapper: ReturnType<typeof mountAuthorize>['wrapper']) => wrapper.findComponent(AuthorizeForm);

describe('AAuthorize prompt=select_account', () => {
    it('shows the account chooser for a lingering (restored) session', async () => {
        const { wrapper } = mountAuthorize();
        await flushPromises();

        expect(hasChooser(wrapper)).toBe(true);
    });

    it('skips the chooser once a login happens on this page (lastAuthOrigin=login)', async () => {
        const { wrapper, store } = mountAuthorize();
        await flushPromises();
        expect(hasChooser(wrapper)).toBe(true);

        // a fresh login via the form stamps lastAuthOrigin — the just-entered
        // credentials ARE the account selection, so the chooser must disappear.
        store().lastAuthOrigin = StoreAuthOrigin.LOGIN;
        await flushPromises();

        expect(hasChooser(wrapper)).toBe(false);
    });

    it('keeps the chooser when only a session restore settles (lastAuthOrigin=restore)', async () => {
        const { wrapper, store } = mountAuthorize();
        await flushPromises();

        // a cookie restore stamps RESTORE, not LOGIN — it must NOT suppress
        // the chooser (that is the whole point of the prompt).
        store().lastAuthOrigin = StoreAuthOrigin.RESTORE;
        await flushPromises();

        expect(hasChooser(wrapper)).toBe(true);
    });

    it('offers the account switch (not an indefinite spinner) when the user never resolves', async () => {
        // loggedIn/realmId are truthy for ANY identity, but userinfo fails for
        // a non-user (client/robot) session — once resolution settles, the
        // chooser must render its escape hatch instead of the loading text.
        const { wrapper } = mountAuthorize({ withUser: false });
        await flushPromises();

        const prompt = wrapper.findComponent(AAccountPrompt);
        expect(prompt.exists()).toBe(true);
        // no resolved user → no "Continue as X", only "use another account"
        expect(prompt.props('identityName')).toEqual('');
    });

    it('drops to the login form when "use another account" is chosen on an unresolvable user', async () => {
        const { wrapper } = mountAuthorize({ withUser: false });
        await flushPromises();

        wrapper.findComponent(AAccountPrompt).vm.$emit('switch');
        await flushPromises();

        expect(hasChooser(wrapper)).toBe(false);
        expect(wrapper.find('.login-form-stub').exists()).toBe(true);
    });
});

describe('AAuthorize prompt=none (silent)', () => {
    // AuthorizeSilentRedirect's onMounted assigns window.location.href — keep it
    // a no-op so the assertions can inspect the rendered component's props.
    beforeEach(() => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: '' },
        });
    });

    it('redirects login_required when the user is not logged in', async () => {
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            loggedIn: false,
        });
        await flushPromises();

        const redirect = silentRedirect(wrapper);
        expect(redirect.exists()).toBe(true);
        expect(redirect.props('error')).toEqual('login_required');
        expect(redirect.props('state')).toEqual('state-1');
        expect(wrapper.findComponent({ name: 'LoginForm' }).exists()).toBe(false);
    });

    it('redirects login_required on a realm mismatch', async () => {
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            realmId: 'other-realm',
        });
        await flushPromises();

        const redirect = silentRedirect(wrapper);
        expect(redirect.exists()).toBe(true);
        expect(redirect.props('error')).toEqual('login_required');
    });

    it('redirects consent_required for a non-built_in client', async () => {
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            clientBuiltIn: false,
        });
        await flushPromises();

        const redirect = silentRedirect(wrapper);
        expect(redirect.exists()).toBe(true);
        expect(redirect.props('error')).toEqual('consent_required');
    });

    it('does NOT redirect a built_in client (auto-consent proceeds)', async () => {
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            clientBuiltIn: true,
        });
        await flushPromises();

        expect(silentRedirect(wrapper).exists()).toBe(false);
        // the auto-consent form renders instead
        expect(wrapper.find('.authorize-form-stub').exists()).toBe(true);
        // verified redirect_uri → the form runs in silent mode (a failure
        // redirects an OIDC error rather than showing manual consent).
        expect(authorizeForm(wrapper).props('silent')).toBe(true);
        // ...and the abort gate receives the verification verdict.
        expect(authorizeForm(wrapper).props('redirectUriVerified')).toBe(true);
    });

    it('drops the silent flag for a built_in client when the redirect_uri is unverified', async () => {
        // Regression: an unverified redirect_uri can't receive an OIDC error, so
        // a silent auto-consent failure previously dead-ended on a frozen spinner.
        // The form must run NON-silent so it can fall back to manual consent.
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            clientBuiltIn: true,
            redirectUriVerified: false,
        });
        await flushPromises();

        expect(silentRedirect(wrapper).exists()).toBe(false);
        expect(wrapper.find('.authorize-form-stub').exists()).toBe(true);
        expect(authorizeForm(wrapper).props('silent')).toBe(false);
    });

    it('forces re-auth (not a stuck spinner) on login_required when the redirect_uri is unverified', async () => {
        // Regression: handleLoginRequired must not set a silent LOGIN_REQUIRED
        // redirect it can't perform (unverified URI). It falls back to the login
        // form instead of leaving AuthorizeForm frozen on its spinner.
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            clientBuiltIn: true,
            redirectUriVerified: false,
        });
        await flushPromises();

        authorizeForm(wrapper).vm.$emit('loginRequired');
        await flushPromises();

        expect(silentRedirect(wrapper).exists()).toBe(false);
        expect(wrapper.find('.login-form-stub').exists()).toBe(true);
    });

    it('degrades to interactive UI when the redirect_uri is not verified', async () => {
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            loggedIn: false,
            redirectUriVerified: false,
        });
        await flushPromises();

        // never redirect an OIDC error to an unverified URI — show the login form
        expect(silentRedirect(wrapper).exists()).toBe(false);
        expect(wrapper.find('.login-form-stub').exists()).toBe(true);
    });
});

describe('AAuthorize consent covering probe (plan 055)', () => {
    // prompt-less request: the ladder runs straight past the chooser/MFA gates
    // to the consent decision, so the probe outcome is observable on the form.
    it('passes consentGranted=true when persisted rows cover every requested scope', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            consentRows: [consentRow('global'), consentRow('openid')],
        });
        await flushPromises();

        expect(wrapper.find('.authorize-form-stub').exists()).toBe(true);
        expect(authorizeForm(wrapper).props('consentGranted')).toBe(true);
    });

    it('passes consentGranted=false when a requested token is uncovered', async () => {
        // rows cover `global` only — `openid` is missing → strict covering fails
        const { wrapper } = mountAuthorize({
            prompt: '',
            consentRows: [consentRow('global')],
        });
        await flushPromises();

        expect(wrapper.find('.authorize-form-stub').exists()).toBe(true);
        expect(authorizeForm(wrapper).props('consentGranted')).toBe(false);
    });

    it('treats an expired matching row as uncovered (dormant expires_at honored)', async () => {
        const past = new Date(Date.now() - 1000).toISOString();
        const { wrapper } = mountAuthorize({
            prompt: '',
            consentRows: [consentRow('global'), consentRow('openid', past)],
        });
        await flushPromises();

        expect(authorizeForm(wrapper).props('consentGranted')).toBe(false);
    });

    it('shows the probe loading text while the probe is pending (non-built_in)', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            consentHandler: () => new Promise(() => {}),
        });
        await flushPromises();

        expect(wrapper.find('.authorize-form-stub').exists()).toBe(false);
        expect(wrapper.text()).toContain('Checking granted permissions');
    });

    it('falls back to interactive consent (covered=false) when the probe errors', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            consentHandler: () => { throw new Error('probe unavailable'); },
        });
        await flushPromises();

        // fail safe: never auto-consent on an unknown covering state
        expect(wrapper.find('.authorize-form-stub').exists()).toBe(true);
        expect(authorizeForm(wrapper).props('consentGranted')).toBe(false);
    });

    it('skips the probe entirely for a built_in client (no loading gate, no request)', async () => {
        // a never-settling handler would deadlock the ladder if the built_in
        // path depended on the probe — it must not.
        const { wrapper, httpClient } = mountAuthorize({
            prompt: '',
            clientBuiltIn: true,
            consentHandler: () => new Promise(() => {}),
        });
        await flushPromises();

        expect(wrapper.find('.authorize-form-stub').exists()).toBe(true);
        expect(
            httpClient.requests.some((request) => request.url.includes('consents')),
        ).toBe(false);
    });

    it('scopes the probe request to the current subject (sub + subKind)', async () => {
        // an actor holding CONSENT_READ would otherwise receive every
        // subject's rows — the probe must always send the subject filter.
        const { httpClient } = mountAuthorize({
            prompt: '',
            consentRows: [consentRow('global'), consentRow('openid')],
        });
        await flushPromises();

        const probe = httpClient.requests.find((request) => request.url.includes('consents'));
        expect(probe).toBeTruthy();
        const probeUrl = decodeURIComponent(probe!.url);
        expect(probeUrl).toContain('filter[sub]=user-1');
        expect(probeUrl).toContain('filter[subKind]=user');
    });

    it('does NOT cover when the matching rows belong to another subject', async () => {
        // defense in depth: even if the server returned a foreign subject's
        // rows (a CONSENT_READ holder), the covering match re-checks sub —
        // auto-consent must never fire off a stranger's grant.
        const { wrapper } = mountAuthorize({
            prompt: '',
            consentRows: [
                { ...consentRow('global'), sub: 'user-2' },
                { ...consentRow('openid'), sub: 'user-2' },
            ],
        });
        await flushPromises();

        expect(authorizeForm(wrapper).props('consentGranted')).toBe(false);
    });
});

describe('AAuthorize prompt=none consent covering (plan 055)', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { href: '' },
        });
    });

    it('falls through to auto-consent (no consent_required redirect) when covered', async () => {
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            consentRows: [consentRow('global'), consentRow('openid')],
        });
        await flushPromises();

        expect(silentRedirect(wrapper).exists()).toBe(false);
        expect(wrapper.find('.authorize-form-stub').exists()).toBe(true);
        expect(authorizeForm(wrapper).props('consentGranted')).toBe(true);
        expect(authorizeForm(wrapper).props('silent')).toBe(true);
    });

    it('redirects consent_required when the rows do not cover the request', async () => {
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.NONE,
            consentRows: [consentRow('global')],
        });
        await flushPromises();

        const redirect = silentRedirect(wrapper);
        expect(redirect.exists()).toBe(true);
        expect(redirect.props('error')).toEqual('consent_required');
    });
});

describe('AAuthorize prompt=login (re-auth)', () => {
    it('forces the login form with a banner even for a logged-in user', async () => {
        const { wrapper } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.LOGIN,
            clientBuiltIn: true,
        });
        await flushPromises();

        // logged in, but prompt=login forces re-auth: the login form shows (not
        // the auto-consent form) until a fresh login on this page
        expect(wrapper.find('.login-form-stub').exists()).toBe(true);
        expect(wrapper.find('.authorize-form-stub').exists()).toBe(false);
    });

    it('proceeds past re-auth once a fresh login stamps lastAuthOrigin', async () => {
        const { wrapper, store } = mountAuthorize({
            prompt: OAuth2AuthorizationPrompt.LOGIN,
            clientBuiltIn: true,
        });
        await flushPromises();
        expect(wrapper.find('.login-form-stub').exists()).toBe(true);

        store().lastAuthOrigin = StoreAuthOrigin.LOGIN;
        await flushPromises();

        // re-auth satisfied → the built_in auto-consent form renders
        expect(wrapper.find('.authorize-form-stub').exists()).toBe(true);
    });
});
