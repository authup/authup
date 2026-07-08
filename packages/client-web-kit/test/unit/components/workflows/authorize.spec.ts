/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest, User } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { OAuth2AuthorizationPrompt } from '@authup/specs';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import {
    describe,
    expect,
    it,
} from 'vitest';
import type { App } from 'vue';
import AAccountPrompt from '../../../../src/components/workflows/authorize/AAccountPrompt.vue';
import AAuthorize from '../../../../src/components/workflows/authorize/Authorize.vue';
import {
    StoreDispatcherEventName,
    injectStore,
    injectStoreDispatcher,
} from '../../../../src/core';
import type { Store, StoreDispatcher } from '../../../../src/core';
import { install } from '../../../../src/module';
import type { Options } from '../../../../src/types';

const noop = () => undefined;
const REALM = { id: 'realm-x', name: 'master' };

// A logged-in, fully-resolved store — the state in which prompt=select_account
// would render the chooser (mimics a lingering session restored from cookies).
function seedLoggedIn(store: Store) {
    store.setAccessToken('access-token');
    store.setRealm({ id: REALM.id, name: REALM.name });
    store.setUser({ id: 'user-1', name: 'jdoe' } as unknown as User);
}

function mountAuthorize() {
    const pinia = createPinia();
    const httpClient = createFakeClient({ handlers: {} });

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
        prompt: OAuth2AuthorizationPrompt.SELECT_ACCOUNT,
    } as OAuth2AuthorizationCodeRequest;

    // non-built_in client → no auto-consent redirect; the chooser is the only
    // thing we assert on.
    const client = {
        id: 'client-1',
        name: 'web',
        display_name: 'Web',
        built_in: false,
        created_at: new Date(0).toISOString(),
    };

    let dispatcher!: StoreDispatcher;

    const wrapper = mount(AAuthorize, {
        props: {
            codeRequest,
            client,
            realm: {
                id: REALM.id, 
                name: REALM.name, 
                display_name: 'Master', 
            },
            scopes: [],
            redirectUriVerified: true,
        },
        global: {
            components: {
                VCIcon: { render: () => null },
                VCButton: { render: () => null },
            },
            // Stub the branch children we don't assert on — avoids AuthorizeForm's
            // scope fetch (aborted at teardown → noisy happy-dom warning).
            stubs: {
                AuthorizeForm: { template: '<div class="authorize-form-stub" />' },
                LoginForm: { template: '<div class="login-form-stub" />' },
            },
            plugins: [
                pinia,
                [vuecs, {}],
                [{ install }, options],
                {
                    install(app: App) {
                        seedLoggedIn(injectStore(pinia, app));
                        dispatcher = injectStoreDispatcher(app);
                    },
                },
            ],
        },
    });

    return { wrapper, dispatcher: () => dispatcher };
}

const hasChooser = (wrapper: ReturnType<typeof mountAuthorize>['wrapper']) => wrapper.findComponent(AAccountPrompt).exists();

describe('AAuthorize prompt=select_account', () => {
    it('shows the account chooser for a lingering (restored) session', async () => {
        const { wrapper } = mountAuthorize();
        await flushPromises();

        expect(hasChooser(wrapper)).toBe(true);
    });

    it('skips the chooser once a login happens on this page (LOGGED_IN)', async () => {
        const { wrapper, dispatcher } = mountAuthorize();
        await flushPromises();
        expect(hasChooser(wrapper)).toBe(true);

        // a fresh login via the form fires LOGGED_IN — the just-entered
        // credentials ARE the account selection, so the chooser must disappear.
        dispatcher().emit(StoreDispatcherEventName.LOGGED_IN);
        await flushPromises();

        expect(hasChooser(wrapper)).toBe(false);
    });

    it('keeps the chooser when only a session restore (RESOLVED) fires', async () => {
        const { wrapper, dispatcher } = mountAuthorize();
        await flushPromises();

        // RESOLVED is emitted by a cookie restore, not an interactive login — it
        // must NOT suppress the chooser (that is the whole point of the prompt).
        dispatcher().emit(StoreDispatcherEventName.RESOLVED);
        await flushPromises();

        expect(hasChooser(wrapper)).toBe(true);
    });
});
