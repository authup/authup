// @vitest-environment node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { createStore, createStoreDispatcher } from '../../../../src/core/store';
import {
    AUTHORIZATION_REALM,
    AUTHORIZATION_SUBJECT,
    buildAuthorizationCheck,
    buildAuthorizationGrants,
} from '../../../utils/authorization';

describe('core/store (check expiry, server render)', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    // A render outlives no deadline, and a timer would hold the process open.
    it('arms no timer while rendering on the server', async () => {
        vi.useFakeTimers();

        const httpClient = createFakeClient({
            handlers: {
                'GET /sessions/@me/introspect': () => ({
                    active: true,
                    sub: AUTHORIZATION_SUBJECT,
                    sub_kind: 'user',
                    name: 'admin',
                    realm_id: AUTHORIZATION_REALM,
                    realm_name: 'master',
                    scope: 'global openid',
                    permissions: buildAuthorizationGrants(),
                }),
            },
        });
        httpClient.authorization.checkWithMaxAge = async () => ({ data: buildAuthorizationCheck(), maxAge: 60 });

        const store = createStore({
            httpClient,
            dispatcher: createStoreDispatcher(),
            cookieSession: true,
        });

        await store.resolve();
        await vi.advanceTimersByTimeAsync(0);

        expect(vi.getTimerCount()).toBe(0);
    });
});
