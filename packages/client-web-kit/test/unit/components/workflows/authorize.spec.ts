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
import { IDENTITY_PROVIDER_LOGIN_NOT_PENDING } from '@authup/core-http-kit';
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
import AMfaChallengeForm from '../../../../src/components/workflows/mfa/AMfaChallengeForm.vue';
import AUserAuthenticatorEnroll from '../../../../src/components/entities/user-authenticator/AUserAuthenticatorEnroll.vue';
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
// `withUser: false` mimics a lingering NON-user (client) session, or a
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
    acrValues?: string,
    consentRows?: Consent[],
    consentHandler?: () => unknown,
    federatedLogin?: { providerId: string },
    challengeHandler?: () => unknown,
    loginCompleteHandler?: () => unknown,
    userInfoHandler?: () => unknown,
};

function mountAuthorize(overrides: MountOverrides = {}) {
    const {
        prompt = OAuth2AuthorizationPrompt.SELECT_ACCOUNT,
        clientBuiltIn = false,
        loggedIn = true,
        withUser = true,
        realmId = REALM.id,
        redirectUriVerified = true,
        acrValues,
        consentRows,
        consentHandler,
        federatedLogin,
        challengeHandler,
        loginCompleteHandler,
        userInfoHandler,
    } = overrides;

    const pinia = createPinia();
    const httpClient = createFakeClient({
        handlers: {
            // a user-less session's re-resolve attempt must settle by failing —
            // the default fallback would otherwise fake a truthy "user".
            'GET /userinfo': userInfoHandler ??
                (() => { throw new Error('userinfo unavailable'); }),
            // The store refuses to commit a session reported as inactive.
            // Subject-less on purpose: the unmatched-route fallback carried
            // none either, so the user-less cases above keep their shape.
            'POST /token/introspect': () => ({ active: true }),
            ...(loginCompleteHandler ?
                { 'POST /identity-providers/provider-1/login-complete': loginCompleteHandler } :
                {}),
            // covering probe: no override → the fallback's empty collection
            // (no persisted consent → covered=false, today's behavior).
            ...(challengeHandler ?
                { 'GET /authenticators/challenge': challengeHandler } :
                {}),
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
        ...(acrValues ? { acr_values: acrValues } : {}),
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
            federatedLogin,
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
        // a non-user (client) session — once resolution settles, the
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
        // v2 expression dialect: the subject filter travels as an
        // and(...) expression inside the single filter parameter.
        expect(probeUrl).toContain("eq(sub,'user-1')");
        expect(probeUrl).toContain("eq(subKind,'user')");
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

// Plan 094: a federated callback hands this page a one-time handle instead of
// the RP's code, so the ladder below runs for an external login too.
describe('AAuthorize federated login', () => {
    const federatedLogin = { providerId: 'provider-1' };

    const grant = () => ({
        access_token: 'federated-at',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'federated-rt',
    });

    const userInfo = () => ({
        id: 'user-1', 
        name: 'jdoe', 
        realmId: REALM.id, 
    });

    it('completes the pending login and counts it as fresh', async () => {
        const {
            wrapper, 
            store, 
            httpClient, 
        } = mountAuthorize({
            loggedIn: false,
            federatedLogin,
            loginCompleteHandler: grant,
            userInfoHandler: userInfo,
        });
        await flushPromises();

        expect(httpClient.requests.some(
            (request) => request.url.includes('identity-providers/provider-1/login-complete'),
        )).toBe(true);
        expect(store().accessToken).toEqual('federated-at');
        expect(store().lastAuthOrigin).toEqual(StoreAuthOrigin.LOGIN);

        // The account was chosen at the provider, so prompt=select_account must
        // not ask again. That holds only because the redemption runs AFTER
        // mount: the lastAuthOrigin CHANGE is what the ladder watches.
        expect(hasChooser(wrapper)).toBe(false);
    });

    it('holds the login form back while the completion is in flight', async () => {
        const { wrapper } = mountAuthorize({
            loggedIn: false,
            federatedLogin,
            loginCompleteHandler: () => new Promise(() => { /* never settles */ }),
        });
        await flushPromises();

        expect(wrapper.find('.login-form-stub').exists()).toBe(false);
        expect(wrapper.find('.authorize-text-stub').exists()).toBe(true);
    });

    it('states the reason and keeps the login form when there is no session to protect', async () => {
        const { wrapper } = mountAuthorize({
            loggedIn: false,
            federatedLogin,
            loginCompleteHandler: () => { throw new Error('the login request is unknown'); },
        });
        await flushPromises();

        expect(wrapper.emitted('failed')).toBeTruthy();
        expect(wrapper.find('.login-form-stub').exists()).toBe(true);
        expect(wrapper.find('.authorize-text-stub').text()).toContain('the login request is unknown');
    });

    /**
     * The person came back from an external provider: consenting the
     * application into whatever account the cookies already held would be
     * silent for a builtIn client.
     */
    it('does not consent a pre-existing session when the redemption fails', async () => {
        const { wrapper } = mountAuthorize({
            loggedIn: true,
            clientBuiltIn: true,
            prompt: '',
            federatedLogin,
            loginCompleteHandler: () => { throw new Error('the redemption failed'); },
        });
        await flushPromises();

        expect(wrapper.findComponent(AuthorizeForm).exists()).toBe(false);
        expect(wrapper.find('.authorize-text-stub').text()).toContain('the redemption failed');
        // The session is gone, so the page falls through to the login form
        // rather than dead-ending: the person can start again as the account
        // they actually came for.
        expect(wrapper.find('.login-form-stub').exists()).toBe(true);
    });

    /**
     * The render-scoped block above lasts one render, and the page has already
     * stripped `provider` from the URL, so a reload would restore the cookies
     * and resume the ladder for the WRONG account.
     */
    it('clears the lingering session so a reload cannot resume it', async () => {
        const { wrapper, store } = mountAuthorize({
            loggedIn: true,
            clientBuiltIn: true,
            prompt: '',
            federatedLogin,
            loginCompleteHandler: () => { throw new Error('the redemption failed'); },
        });
        await flushPromises();

        expect(wrapper.emitted('failed')).toBeTruthy();
        expect(store().accessToken).toBeNull();
        expect(store().refreshToken).toBeNull();
    });

    /**
     * `provider` is a plain query parameter anyone can put in a link, so a
     * completion that never began must not tear the visitor's session down -
     * that would make every authorize URL a one-click logout.
     */
    it('keeps the session when the server says no completion was pending', async () => {
        const { store } = mountAuthorize({
            loggedIn: true,
            clientBuiltIn: true,
            prompt: '',
            federatedLogin,
            loginCompleteHandler: () => {
                throw Object.assign(
                    new Error('The login request is unknown or expired.'),
                    { reason: IDENTITY_PROVIDER_LOGIN_NOT_PENDING },
                );
            },
        });
        await flushPromises();

        expect(store().accessToken).not.toBeNull();
    });
});

/**
 * The server owns the rule about whether a session still owes a local factor,
 * and it can only answer for the request being satisfied. So the page has to
 * state that request: this parameter is the only thing that makes a federated
 * session step up at all.
 */
describe('AAuthorize challenge request', () => {
    it('asks the challenge endpoint about the acr_values it is satisfying', async () => {
        const { httpClient } = mountAuthorize({ acrValues: 'urn:authup:mfa' });
        await flushPromises();

        const challengeRequest = httpClient.requests.find(
            (request) => request.url.includes('authenticators/challenge'),
        );

        expect(challengeRequest).toBeDefined();
        expect(challengeRequest?.url).toContain('acrValues=urn%3Aauthup%3Amfa');
    });

    it('leaves the query bare when the request asks for nothing', async () => {
        const { httpClient } = mountAuthorize();
        await flushPromises();

        const challengeRequest = httpClient.requests.find(
            (request) => request.url.includes('authenticators/challenge'),
        );

        expect(challengeRequest).toBeDefined();
        expect(challengeRequest?.url).not.toContain('acrValues');
    });
});

/**
 * The gate the whole ladder exists for. The server decides whether a session
 * owes a factor; these pin what the page renders for each answer, and that it
 * does not let consent through before it knows.
 */
describe('AAuthorize MFA gate', () => {
    it('holds consent back until the challenge status is known', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            challengeHandler: () => new Promise(() => { /* never settles */ }),
        });
        await flushPromises();

        // a builtIn client auto-submits on mount, so the form must not render
        // before the requirement is known
        expect(wrapper.findComponent(AuthorizeForm).exists()).toBe(false);
        expect(wrapper.find('.authorize-text-stub').exists()).toBe(true);
    });

    it('renders the challenge when the session owes a factor', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            challengeHandler: () => ({
                required: true,
                enrollmentRequired: false,
                kinds: ['totp'],
            }),
        });
        await flushPromises();

        const challenge = wrapper.findComponent(AMfaChallengeForm);
        expect(challenge.exists()).toBe(true);
        expect(challenge.props('kinds')).toEqual(['totp']);
        // no session-less ticket on this path: the bearer already exists
        expect(challenge.props('ticket')).toBeNull();
        expect(wrapper.findComponent(AuthorizeForm).exists()).toBe(false);
    });

    it('proceeds to consent once the challenge is done', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            challengeHandler: () => ({
                required: true,
                enrollmentRequired: false,
                kinds: ['totp'],
            }),
        });
        await flushPromises();

        wrapper.findComponent(AMfaChallengeForm).vm.$emit('done');
        await flushPromises();

        expect(wrapper.findComponent(AuthorizeForm).exists()).toBe(true);
    });

    it('renders inline enrollment when the session owes a device', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            challengeHandler: () => ({
                required: false,
                enrollmentRequired: true,
                kinds: [],
            }),
        });
        await flushPromises();

        expect(wrapper.findComponent(AUserAuthenticatorEnroll).exists()).toBe(true);
        expect(wrapper.findComponent(AuthorizeForm).exists()).toBe(false);
    });

    it('goes straight to consent when the session owes nothing', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            challengeHandler: () => ({
                required: false,
                enrollmentRequired: false,
                kinds: [],
            }),
        });
        await flushPromises();

        expect(wrapper.findComponent(AMfaChallengeForm).exists()).toBe(false);
        expect(wrapper.findComponent(AuthorizeForm).exists()).toBe(true);
    });

    /**
     * The server backstop stays authoritative, so a status lookup that keeps
     * failing must not brick the page.
     */
    it('fails open to consent when the status cannot be fetched', async () => {
        const { wrapper } = mountAuthorize({
            prompt: '',
            challengeHandler: () => { throw new Error('challenge unavailable'); },
        });
        await flushPromises();

        expect(wrapper.findComponent(AuthorizeForm).exists()).toBe(true);
    });
});
