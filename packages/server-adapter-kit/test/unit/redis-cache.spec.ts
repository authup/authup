/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JsonAdapter } from 'redis-extension';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { TokenCacheEntry } from 'vouchly';
import { RedisTokenCache } from '../../src';

const entry : TokenCacheEntry = {
    claims: { sub: 'user', exp: 1 },
    issuer: 'authup',
    source: 'local',
};

describe('redis token cache', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function create() {
        return new RedisTokenCache({} as ConstructorParameters<typeof RedisTokenCache>[0]);
    }

    it('stores an entry under a vouchly key, rounding the ttl up', async () => {
        const set = vi.spyOn(JsonAdapter.prototype, 'set').mockResolvedValue(undefined);

        await create().set('abc', entry, 1.2);

        expect(set).toHaveBeenCalledWith('vouchly:abc', entry, { seconds: 2 });
    });

    it('stores nothing for a ttl that is not positive', async () => {
        const set = vi.spyOn(JsonAdapter.prototype, 'set').mockResolvedValue(undefined);

        await create().set('abc', entry, 0);

        expect(set).not.toHaveBeenCalled();
    });

    it('reads an entry under the vouchly key', async () => {
        const get = vi.spyOn(JsonAdapter.prototype, 'get').mockResolvedValue(entry);

        await expect(create().get('abc')).resolves.toEqual(entry);
        expect(get).toHaveBeenCalledWith('vouchly:abc');
    });
});
