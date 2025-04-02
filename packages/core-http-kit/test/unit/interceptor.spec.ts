/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Client, ClientResponseTokenHook,
    getClientRequestRetryState,
} from '../../src';

describe('src/interceptor/utils', () => {
    it('should mount and unmount interceptor', () => {
        const hook = new ClientResponseTokenHook({
            tokenCreator: {
                type: 'user',
                name: 'admin',
                password: 'start123',
            },
        });

        const client = new Client();

        expect(hook.isMounted(client)).toBeFalsy();

        hook.mount(client);
        expect(hook.isMounted(client)).toBeTruthy();

        hook.unmount(client);
        expect(hook.isMounted(client)).toBeFalsy();
    });

    it('should get current request retry state', () => {
        let retryState = getClientRequestRetryState({});
        expect(retryState.retryCount).toEqual(0);

        retryState = getClientRequestRetryState({ retry: { retryCount: 2 } });
        expect(retryState.retryCount).toEqual(2);
    });
});
