/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DeviceAuthorizationInfo } from '@authup/core-http-kit';
import { IDENTITY_PROVIDER_LOGIN_NOT_PENDING } from '@authup/core-http-kit';
import type { FakeClient, FakeHandlerMap } from '@authup/core-http-kit/testing';
import { DeviceVerificationThrottledError } from '@authup/errors';
import { flushPromises } from '@vue/test-utils';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import AUserAuthenticatorEnroll from '../../../../src/components/entities/user-authenticator/AUserAuthenticatorEnroll.vue';
import { ADeviceVerifyForm } from '../../../../src/components/workflows/device';
import { ALoginForm } from '../../../../src/components/workflows/login';
import AMfaChallengeForm from '../../../../src/components/workflows/mfa/AMfaChallengeForm.vue';
import { StoreAuthStatus, injectStore } from '../../../../src/core';
import { mountKitComponent } from '../../../utils';

// The locally registered VCIcon would otherwise fetch every unregistered
// icon from the iconify API, which happy-dom aborts at teardown.
vi.mock('@vuecs/icon', () => ({ VCIcon: { name: 'VCIcon', render: () => null } }));

const REALM = {
    id: 'realm-x', 
    name: 'master', 
    displayName: 'Master', 
};

function buildInfo(overrides: Partial<DeviceAuthorizationInfo['client']> = {}) : DeviceAuthorizationInfo {
    return {
        client: {
            id: 'client-1',
            name: 'tv-app',
            displayName: 'TV App',
            builtIn: false,
            createdAt: new Date(0).toISOString(),
            ...overrides,
        },
        realm: REALM,
        scope: 'global openid',
    };
}

function oauth2Error(error: string, status = 400) {
    return () => {
        const e = new Error(error) as Error & { response?: unknown };
        e.response = {
            status,
            data: {
                code: error,
                error,
                message: error,
            },
        };
        throw e;
    };
}

function loginCompleteError(body: Record<string, unknown>) {
    return () => {
        const e = new Error(String(body.message ?? 'the redemption failed')) as Error & { response?: unknown };
        e.response = {
            status: 400,
            data: body,
        };
        throw e;
    };
}

function requestsTo(httpClient: FakeClient, pathname: string) {
    return httpClient.requests.filter(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname === pathname,
    );
}

function mountForm(
    props: Record<string, any> = {},
    handlers: FakeHandlerMap = {},
    loggedIn = true,
) {
    const mounted = mountKitComponent(ADeviceVerifyForm, props, {
        'POST /device_authorization/lookup': () => buildInfo(),
        'GET /authenticators/challenge': () => ({
            required: false,
            enrollmentRequired: false,
            kinds: [],
        }),
        'POST /device_authorization/approve': () => ({ status: 'approved' }),
        'POST /device_authorization/deny': () => ({ status: 'denied' }),
        ...handlers,
    });

    const store = injectStore(mounted.pinia, mounted.wrapper.vm.$.appContext.app);
    if (loggedIn) {
        store.setAccessToken('access-token');
        store.setRealm({ id: REALM.id, name: REALM.name });
        store.setUser({
            id: 'user-1',
            name: 'jdoe',
            displayName: null,
            email: 'jdoe@example.com',
        });
    }

    return { ...mounted, store };
}

async function submitCode(wrapper: ReturnType<typeof mountForm>['wrapper'], code?: string) {
    if (typeof code === 'string') {
        await wrapper.find('input').setValue(code);
    }

    await wrapper.find('form').trigger('submit');
    await flushPromises();
}

const findButton = (wrapper: ReturnType<typeof mountForm>['wrapper'], label: string) => wrapper
    .findAll('button')
    .find((button) => button.text() === label);

describe('ADeviceVerifyForm', () => {
    it('renders the prefilled code formatted and confirms it with a normalized body', async () => {
        const { wrapper, httpClient } = mountForm({ userCode: 'bcdf-ghjk' });

        const input = wrapper.find('input');
        expect((input.element as HTMLInputElement).value).toEqual('BCDF-GHJK');

        await submitCode(wrapper);

        const [lookup] = requestsTo(httpClient, '/device_authorization/lookup');
        expect(lookup).toBeDefined();
        expect(lookup.body).toEqual({ user_code: 'BCDFGHJK' });

        expect(wrapper.text()).toContain('TV App');
        expect(wrapper.text()).toContain('asking for access to your account');
        expect(wrapper.text()).toContain('global');
        expect(wrapper.text()).toContain('openid');
    });

    it('renders the login form when logged out and looks the code up after the login', async () => {
        const { wrapper, httpClient } = mountForm({}, {}, false);

        await submitCode(wrapper, 'bcdf ghjk');

        expect(wrapper.findComponent(ALoginForm).exists()).toBe(true);
        expect(requestsTo(httpClient, '/device_authorization/lookup')).toHaveLength(0);

        wrapper.findComponent(ALoginForm).vm.$emit('done');
        await flushPromises();

        const [lookup] = requestsTo(httpClient, '/device_authorization/lookup');
        expect(lookup).toBeDefined();
        expect(lookup.body).toEqual({ user_code: 'BCDFGHJK' });
        expect(wrapper.text()).toContain('TV App');
    });

    it('hands its code to the login form', async () => {
        const { wrapper } = mountForm({ userCode: 'BCDFGHJK' }, {}, false);

        await submitCode(wrapper);

        const loginForm = wrapper.findComponent(ALoginForm);
        expect(loginForm.exists()).toBe(true);
        expect(loginForm.props('deviceUserCode')).toEqual('BCDFGHJK');
    });

    it('returns to the code step with the invalid-code text on invalid_grant', async () => {
        const { wrapper } = mountForm({ userCode: 'BCDFGHJK' }, { 'POST /device_authorization/lookup': oauth2Error('invalid_grant') });

        await submitCode(wrapper);

        expect(wrapper.find('input').exists()).toBe(true);
        expect(wrapper.text()).toContain('The code is invalid or has expired. Check your device and try again.');
        expect(wrapper.emitted('failed')).toBeFalsy();
    });

    it('renders the throttled text for a throttle error rehydrated from JSON', async () => {
        const { wrapper } = mountForm({ userCode: 'BCDFGHJK' }, {
            'POST /device_authorization/lookup': () => {
                const e = new Error('throttled') as Error & { response?: unknown };
                e.response = { data: JSON.parse(JSON.stringify(new DeviceVerificationThrottledError({ retryAfter: 42 }))) };
                throw e;
            },
        });

        await submitCode(wrapper);

        expect(wrapper.find('input').exists()).toBe(true);
        expect(wrapper.text()).toContain('Too many attempts. Wait a few minutes and try again.');
    });

    it('renders the realm-mismatch card on login_required and offers another account', async () => {
        const { wrapper, store } = mountForm({ userCode: 'BCDFGHJK' }, { 'POST /device_authorization/lookup': oauth2Error('login_required') });

        await submitCode(wrapper);

        expect(wrapper.text()).toContain('Sign in with a different account');
        expect(wrapper.findComponent(ALoginForm).exists()).toBe(false);

        const button = findButton(wrapper, 'Use another account');
        expect(button).toBeDefined();
        await button!.trigger('click');
        await flushPromises();

        expect(store.accessToken).toBeNull();
        expect(wrapper.findComponent(ALoginForm).exists()).toBe(true);
    });

    it('never describes an earlier code on the realm-mismatch card', async () => {
        const { wrapper } = mountForm({ userCode: 'BCDFGHJK' }, {
            'POST /device_authorization/lookup': (request) => {
                const { user_code: userCode } = request.body as { user_code: string };
                if (userCode === 'BCDFGHJK') {
                    return buildInfo();
                }

                return oauth2Error('login_required')();
            },
            'POST /device_authorization/approve': oauth2Error('invalid_grant'),
        });

        await submitCode(wrapper);
        expect(wrapper.text()).toContain('TV App');

        await findButton(wrapper, 'Authorize')!.trigger('click');
        await flushPromises();
        expect(wrapper.find('input').exists()).toBe(true);

        await submitCode(wrapper, 'WDJB-MKLP');

        expect(wrapper.text()).toContain('Sign in with a different account');
        expect(wrapper.text()).not.toContain('TV App');
        expect(wrapper.text()).not.toContain('Master');
    });

    it('renders the challenge when the session owes a factor and confirms once it is done', async () => {
        const { wrapper } = mountForm({ userCode: 'BCDFGHJK' }, {
            'GET /authenticators/challenge': () => ({
                required: true,
                enrollmentRequired: false,
                kinds: ['totp'],
            }),
        });

        await submitCode(wrapper);

        const challenge = wrapper.findComponent(AMfaChallengeForm);
        expect(challenge.exists()).toBe(true);
        expect(challenge.props('kinds')).toEqual(['totp']);
        expect(findButton(wrapper, 'Authorize')).toBeUndefined();

        challenge.vm.$emit('done');
        await flushPromises();

        expect(wrapper.findComponent(AMfaChallengeForm).exists()).toBe(false);
        expect(findButton(wrapper, 'Authorize')).toBeDefined();
    });

    it('renders inline enrollment when the session owes a device', async () => {
        const { wrapper } = mountForm({ userCode: 'BCDFGHJK' }, {
            'GET /authenticators/challenge': () => ({
                required: false,
                enrollmentRequired: true,
                kinds: [],
            }),
        });

        await submitCode(wrapper);

        expect(wrapper.findComponent(AUserAuthenticatorEnroll).exists()).toBe(true);
        expect(findButton(wrapper, 'Authorize')).toBeUndefined();
    });

    it('renders the challenge when the approval answers mfa_required', async () => {
        const { wrapper } = mountForm({ userCode: 'BCDFGHJK' }, { 'POST /device_authorization/approve': oauth2Error('mfa_required') });

        await submitCode(wrapper);
        await findButton(wrapper, 'Authorize')!.trigger('click');
        await flushPromises();

        expect(wrapper.findComponent(AMfaChallengeForm).exists()).toBe(true);
        expect(wrapper.emitted('done')).toBeFalsy();
    });

    it('approves and emits done', async () => {
        const { wrapper, httpClient } = mountForm({ userCode: 'BCDFGHJK' });

        await submitCode(wrapper);
        await findButton(wrapper, 'Authorize')!.trigger('click');
        await flushPromises();

        const [approve] = requestsTo(httpClient, '/device_authorization/approve');
        expect(approve).toBeDefined();
        expect(approve.body).toEqual({ user_code: 'BCDFGHJK' });
        expect(wrapper.emitted('done')).toEqual([['approved']]);
        expect(wrapper.text()).toContain('Device connected.');
    });

    it('denies and emits done', async () => {
        const { wrapper, httpClient } = mountForm({ userCode: 'BCDFGHJK' });

        await submitCode(wrapper);
        await findButton(wrapper, 'Abort')!.trigger('click');
        await flushPromises();

        const [deny] = requestsTo(httpClient, '/device_authorization/deny');
        expect(deny).toBeDefined();
        expect(deny.body).toEqual({ user_code: 'BCDFGHJK' });
        expect(requestsTo(httpClient, '/device_authorization/approve')).toHaveLength(0);
        expect(wrapper.emitted('done')).toEqual([['denied']]);
        expect(wrapper.text()).toContain('Access denied. Nothing was connected');
    });

    it('renders the access-denied text when the approval is refused by policy', async () => {
        const { wrapper } = mountForm({ userCode: 'BCDFGHJK' }, { 'POST /device_authorization/approve': oauth2Error('access_denied') });

        await submitCode(wrapper);
        await findButton(wrapper, 'Authorize')!.trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('You are not permitted to access this application.');
        expect(findButton(wrapper, 'Authorize')).toBeUndefined();
    });

    it('still renders the confirm step for a builtIn client', async () => {
        const { wrapper, httpClient } = mountForm({ userCode: 'BCDFGHJK' }, { 'POST /device_authorization/lookup': () => buildInfo({ builtIn: true }) });

        await submitCode(wrapper);

        expect(findButton(wrapper, 'Authorize')).toBeDefined();
        expect(findButton(wrapper, 'Abort')).toBeDefined();
        expect(requestsTo(httpClient, '/device_authorization/approve')).toHaveLength(0);
        expect(wrapper.emitted('done')).toBeFalsy();
    });
});

/**
 * The person signed in at an external provider and came back. The page has
 * the pending login to redeem, and has to land on the code step for the
 * confirmation click rather than on the lookup (#3589).
 */
describe('ADeviceVerifyForm federated login', () => {
    const FEDERATED_LOGIN = { providerId: 'p-1' };

    const LOGIN_COMPLETE_PATH = '/identity-providers/p-1/login-complete';

    const federatedHandlers = (overrides: FakeHandlerMap = {}) : FakeHandlerMap => ({
        'POST /identity-providers/p-1/login-complete': () => ({
            access_token: 'federated-at',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'federated-rt',
        }),
        'POST /token/introspect': () => ({
            active: true,
            sub: 'user-1',
            sub_kind: 'user',
            name: 'jdoe',
            realm_id: REALM.id,
            realm_name: REALM.name,
        }),
        ...overrides,
    });

    it('completes a federated login and returns to the prefilled code step', async () => {
        const { wrapper, httpClient } = mountForm(
            { userCode: 'BCDFGHJK', federatedLogin: FEDERATED_LOGIN },
            federatedHandlers(),
            false,
        );
        await flushPromises();

        expect(requestsTo(httpClient, LOGIN_COMPLETE_PATH)).toHaveLength(1);
        expect(requestsTo(httpClient, '/device_authorization/lookup')).toHaveLength(0);

        const input = wrapper.find('input');
        expect((input.element as HTMLInputElement).value).toEqual('BCDF-GHJK');
        expect(wrapper.findComponent(ALoginForm).exists()).toBe(false);
    });

    it('looks the code up only after the person confirms it', async () => {
        const { wrapper, httpClient } = mountForm(
            { userCode: 'BCDFGHJK', federatedLogin: FEDERATED_LOGIN },
            federatedHandlers(),
            false,
        );
        await flushPromises();

        await submitCode(wrapper);

        const lookups = requestsTo(httpClient, '/device_authorization/lookup');
        expect(lookups).toHaveLength(1);
        expect(lookups[0].body).toEqual({ user_code: 'BCDFGHJK' });
    });

    it('signs the lingering session out when the redemption fails', async () => {
        const { wrapper, store } = mountForm(
            { userCode: 'BCDFGHJK', federatedLogin: FEDERATED_LOGIN },
            federatedHandlers({ 'POST /identity-providers/p-1/login-complete': loginCompleteError({ message: 'The login request is unknown or expired.' }) }),
        );
        await flushPromises();

        expect(store.status).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(wrapper.emitted('failed')).toBeTruthy();
        expect(wrapper.find('input').exists()).toBe(true);
    });

    it('keeps the session when no login was pending', async () => {
        const { store } = mountForm(
            { userCode: 'BCDFGHJK', federatedLogin: FEDERATED_LOGIN },
            federatedHandlers({
                'POST /identity-providers/p-1/login-complete': loginCompleteError({
                    message: 'The login request is unknown or expired.',
                    reason: IDENTITY_PROVIDER_LOGIN_NOT_PENDING,
                }),
            }),
        );
        await flushPromises();

        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);
    });

    it('renders the access-denied card for the access_denied marker', async () => {
        const { wrapper, httpClient } = mountForm(
            {
                userCode: 'BCDFGHJK', 
                error: 'access_denied', 
                federatedLogin: FEDERATED_LOGIN, 
            },
            federatedHandlers(),
        );
        await flushPromises();

        expect(wrapper.text()).toContain('You are not permitted to access this application.');
        expect(wrapper.find('input').exists()).toBe(false);
        expect(requestsTo(httpClient, LOGIN_COMPLETE_PATH)).toHaveLength(0);
    });
});
