/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    Client,
    ClientAuthenticationHook,
    getClientRequestRetryState,
} from '../../src';
import { createUserTokenCreator } from '../../src/token-creator/presets/index.ts';

describe('src/interceptor/utils', () => {
    it('should mount and unmount interceptor', () => {
        const hook = new ClientAuthenticationHook({
            tokenCreator: createUserTokenCreator({
                name: 'admin',
                password: 'start123',
            }),
        });

        const client = new Client();

        expect(hook.isAttached(client)).toBeFalsy();

        hook.attach(client);
        expect(hook.isAttached(client)).toBeTruthy();

        hook.detach(client);
        expect(hook.isAttached(client)).toBeFalsy();
    });

    it('should get current request retry state', () => {
        let retryState = getClientRequestRetryState({});
        expect(retryState.retryCount).toEqual(0);

        retryState = getClientRequestRetryState({ retry: { retryCount: 2 } });
        expect(retryState.retryCount).toEqual(2);
    });
});
