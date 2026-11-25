/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { Client, ClientAuthenticationHook, ClientAuthenticationHookEventName } from '@authup/core-http-kit';
import type { IClient } from '@authup/core-http-kit';
import type { App } from 'vue';
import { storeToRefs } from 'pinia';
import { hasHTTPClientAuthenticationHook, provideHTTPClientAuthenticationHook } from './singleton.ts';
import { StoreDispatcherEventName, injectStoreDispatcher, injectStoreFactory } from '../../store/index.ts';
import { buildHTTPClient } from '../build.ts';
import type { HTTPClientAuthenticationHookInstallOptions } from './types.ts';

export function installHTTPClientAuthenticationHook(
    app: App,
    options: HTTPClientAuthenticationHookInstallOptions = {},
) {
    if (hasHTTPClientAuthenticationHook(app)) {
        return;
    }

    const storeFactory = injectStoreFactory(app);
    const store = storeFactory(options.pinia);

    const { refreshToken } = storeToRefs(store);

    // Whether the last acquisition wrote its grant to the store. A refresh
    // is single-flight in the hook, so one slot is enough.
    let refreshApplied = false;

    // Never the client the hook is attached to: a 401 from `/token` would
    // wait on the very refresh it belongs to. A client function answers a
    // new instance per call; one instance is rebuilt from its configuration
    // (defaults, headers, transport), which carries no hooks.
    const buildClient = () : IClient => {
        const { httpClient } = options;

        if (httpClient && typeof httpClient !== 'function') {
            return new Client(httpClient.toOptions());
        }

        return buildHTTPClient(options);
    };

    const hook = new ClientAuthenticationHook({
        tokenCreator: async () => {
            if (!refreshToken.value) {
                throw new Error('No refresh token available.');
            }

            // Through the store's locked acquisition, so a timer or a 401 in
            // one tab never presents a token another tab already rotated
            // (#3925). The store writes the grant itself, inside the lock,
            // and drops (and revokes) one a logout or a newer session
            // overtook while it was in flight.
            const { response, applied } = await store.acquireTokenGrant(
                refreshToken.value,
                (token) => buildClient().token.createWithRefreshToken({ refresh_token: token }),
            );

            refreshApplied = applied;

            return response;
        },
        timer: !options.isServer,
        // A server render cannot persist a rotated refresh token once its
        // response is committed, so a refresh there would spend the only
        // token the browser holds (#3924). The browser refreshes after
        // hydration; the awaited resolve() before the render is the one
        // server-side refresh.
        retry: !options.isServer,
    });

    const storeDispatcher = injectStoreDispatcher(app);

    hook.on(ClientAuthenticationHookEventName.REFRESH_FINISHED, () => {
        if (refreshApplied) {
            return;
        }

        // The store dropped the grant, but the hook already applied it to
        // itself (header + timer): re-sync it from the store's current state
        // so attached clients never keep the dropped session's bearer.
        handleAccessTokenEvent();
        handleAccessTokenExpireDateEvent();
    });

    let isSelfCallee = false;

    hook.on(ClientAuthenticationHookEventName.HEADER_UNSET, () => {
        if (!isSelfCallee) {
            // A background refresh failed (not a store-driven token clear):
            // tear the session down and signal an involuntary expiry so the
            // host app can redirect an idle user off an auth-only page. The
            // emit runs even if logout() rejects (session is dead regardless),
            // and the catch keeps a logout failure from surfacing as an
            // unhandled rejection.
            Promise.resolve()
                .then(() => store.logout())
                .catch(() => { /* best-effort cleanup */ })
                .finally(() => {
                    storeDispatcher.emit(StoreDispatcherEventName.SESSION_EXPIRED);
                });
        }
    });

    const handleAccessTokenEvent = () => {
        isSelfCallee = true;

        if (store.accessToken) {
            hook.enable();
            hook.setAuthorizationHeader({
                type: 'Bearer',
                token: store.accessToken as string,
            });
        } else {
            hook.disable();
            hook.unsetAuthorizationHeader();
        }

        isSelfCallee = false;
    };

    const handleAccessTokenExpireDateEvent = () => {
        if (store.accessTokenExpireDate) {
            const expiresIn = Math.floor((store.accessTokenExpireDate.getTime() - Date.now()) / 1000);

            hook.setTimer(expiresIn);
        } else {
            // no expire date -> nothing to refresh against: a stale armed
            // timer (e.g. re-armed by a dropped background refresh) would
            // fire a doomed refresh after logout.
            hook.clearTimer();
        }
    };

    storeDispatcher.on(
        StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
        () => handleAccessTokenEvent(),
    );

    storeDispatcher.on(
        StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
        () => handleAccessTokenExpireDateEvent(),
    );

    handleAccessTokenEvent();
    handleAccessTokenExpireDateEvent();

    provideHTTPClientAuthenticationHook(hook, app);
}
