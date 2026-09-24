// @vitest-environment node

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { renderToString } from '@vue/server-renderer';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import AAuthorize from '../../../../src/components/workflows/authorize/Authorize.vue';
import { injectStore } from '../../../../src/core';
import { install } from '../../../../src/module';
import { createFakeHydrationStore } from '../../../utils/hydration';

const noop = () => undefined;

const CODE_REQUEST : OAuth2AuthorizationCodeRequest = {
    response_type: 'code',
    client_id: 'web',
    realm_id: 'realm-1',
    redirect_uri: 'https://app.example.com/cb',
    scope: 'openid',
    state: 'state-1',
    code_challenge: 'challenge',
    code_challenge_method: 'S256',
};

function buildClient(builtIn: boolean) : Client {
    return {
        id: 'client-1',
        name: 'web',
        displayName: 'Web',
        builtIn,
        realmId: 'realm-1',
    } as Client;
}

async function render(
    props: Record<string, any>,
    options: { loggedIn?: boolean, consentScopes?: string[] } = {},
) {
    const pinia = createPinia();
    const hydration = createFakeHydrationStore();
    const httpClient = createFakeClient({
        handlers: {
            'GET /authenticators/challenge': () => ({
                required: false,
                enrollmentRequired: false,
                kinds: [],
            }),
            'GET /consents': () => {
                const data = (options.consentScopes ?? []).map((scope) => ({
                    scope,
                    sub: 'user-1',
                    subKind: 'user',
                    expiresAt: null,
                }));

                return { data, meta: { total: data.length } };
            },
        },
    });

    const app = createSSRApp({ render: () => h(AAuthorize, props) });
    app.use(pinia);
    app.use(vuecs, {});
    app.use({ install }, {
        baseURL: 'http://fake.test',
        httpClient,
        pinia,
        isServer: true,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
        hydrationStore: hydration.store,
    });

    if (options.loggedIn) {
        // the state the auth console's router guard leaves after resolving
        // the forwarded access token
        const store = app.runWithContext(() => injectStore());
        store.setAccessToken('access-token');
        store.setRealm({ id: 'realm-1', name: 'master' });
        store.sessionId = 'session-1';
        store.setUser({
            id: 'user-1', 
            name: 'jdoe', 
            displayName: null, 
            email: 'jdoe@example.com', 
        });
    }

    const html = await renderToString(app);

    return {
        html,
        entries: hydration.entries,
        requests: httpClient.requests.map((request) => new URL(request.url, 'http://fake.test').pathname),
    };
}

describe('components/workflows/authorize (server render)', () => {
    it('renders an error payload in the markup, not after hydration', async () => {
        // A federated return registers no prefetch, so the first pass renders
        // synchronously: only an error set during setup reaches the markup.
        const { html } = await render({
            error: new Error('The client is not active.'),
            federatedLogin: { providerId: 'provider-1' },
        });

        expect(html).toContain('The client is not active.');
    });

    it('renders a logged-out visitor the login form', async () => {
        const {
            html, 
            entries, 
            requests, 
        } = await render({
            codeRequest: CODE_REQUEST,
            client: buildClient(false),
        });

        expect(html).toContain('type="password"');
        expect(Object.keys(entries).filter((key) => key.startsWith('authup:authorize:'))).toEqual([]);
        expect(requests).not.toContain('/authenticators/challenge');
    });

    it('resolves the second factor and the consent once, and hands both over', async () => {
        const {
            html, 
            entries, 
            requests, 
        } = await render({
            codeRequest: CODE_REQUEST,
            client: buildClient(false),
        }, { loggedIn: true });

        // one request each: a second challenge would mint a second WebAuthn
        // nonce and orphan the one the markup carries
        expect(requests.filter((path) => path === '/authenticators/challenge')).toHaveLength(1);
        expect(requests.filter((path) => path === '/consents')).toHaveLength(1);

        expect(entries['authup:authorize:mfa:session-1:user-1:']).toEqual({
            required: false,
            enrollmentRequired: false,
            kinds: [],
        });
        expect(entries['authup:authorize:consent:user-1:client-1:openid']).toEqual({ covered: false });

        // past every loading state: the manual consent form, signed in as
        // the resolved user
        expect(html).not.toContain('type="password"');
        expect(html).not.toContain('animate-spin');
        expect(html).toContain('jdoe');
    });

    it('hands a covering consent over, which auto-consents', async () => {
        const { entries } = await render({
            codeRequest: CODE_REQUEST,
            client: buildClient(false),
        }, { loggedIn: true, consentScopes: ['openid'] });

        expect(entries['authup:authorize:consent:user-1:client-1:openid']).toEqual({ covered: true });
    });

    it('hands nothing over for a federated return', async () => {
        const { entries, requests } = await render({
            codeRequest: CODE_REQUEST,
            client: buildClient(false),
            federatedLogin: { providerId: 'provider-1' },
        }, { loggedIn: true });

        expect(Object.keys(entries).filter((key) => key.startsWith('authup:authorize:'))).toEqual([]);
        expect(requests).not.toContain('/authenticators/challenge');
    });
});
