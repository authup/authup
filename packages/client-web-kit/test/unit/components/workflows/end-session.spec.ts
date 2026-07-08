/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import vuecs from '@vuecs/core';
import { createPinia } from 'pinia';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { MockInstance } from 'vitest';
import type { App } from 'vue';
import { AEndSessionForm } from '../../../../src/components/workflows/end-session';
import { injectStore } from '../../../../src/core';
import { install } from '../../../../src/module';
import type { Options } from '../../../../src/types';

const noop = () => undefined;

function mountEndSession(
    props: Record<string, any> = {},
    seedUser?: Pick<User, 'id'>,
) {
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

    let logout: MockInstance;

    const wrapper = mount(AEndSessionForm, {
        props,
        global: {
            components: {
                VCIcon: { render: () => null },
                VCButton: { render: () => null },
            },
            plugins: [
                pinia,
                [vuecs, {}],
                [{ install }, options],
                {
                    // runs after the kit install (which provides the store
                    // factory) and BEFORE the component mounts, so the seeded
                    // user is present when AEndSessionForm's onMounted evaluates
                    // the auto-logout gate.
                    install(app: App) {
                        const store = injectStore(pinia, app);
                        if (seedUser) {
                            store.user = seedUser as User;
                        }
                        logout = vi.spyOn(store, 'logout').mockResolvedValue(undefined);
                    },
                },
            ],
        },
    });

    return { wrapper, logout: () => logout };
}

describe('AEndSessionForm', () => {
    it('should auto-sign-out when the revoked subject is the current user', async () => {
        const { logout } = mountEndSession(
            { serverRevoked: true, hintSub: 'user-1' },
            { id: 'user-1' },
        );
        await flushPromises();

        expect(logout()).toHaveBeenCalledTimes(1);
    });

    it('should NOT auto-sign-out when the revoked subject differs from the current user (forced-logout CSRF guard)', async () => {
        const { logout } = mountEndSession(
            { serverRevoked: true, hintSub: 'attacker' },
            { id: 'victim' },
        );
        await flushPromises();

        expect(logout()).not.toHaveBeenCalled();
    });

    it('should NOT auto-sign-out for a logged-out visitor (no current user)', async () => {
        const { logout } = mountEndSession({ serverRevoked: true, hintSub: 'user-1' });
        await flushPromises();

        expect(logout()).not.toHaveBeenCalled();
    });

    it('should NOT auto-sign-out when the server did not revoke (click-gated)', async () => {
        const { logout } = mountEndSession(
            { serverRevoked: false, hintSub: 'user-1' },
            { id: 'user-1' },
        );
        await flushPromises();

        expect(logout()).not.toHaveBeenCalled();
    });
});
