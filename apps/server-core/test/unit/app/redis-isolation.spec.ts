/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { TaggedCacheInjectionKey } from '../../../src/app/modules/cache/index.ts';
import { buildTestRedisOptions, createTestApplication } from '../../app/index.ts';

// Spec files sharing a pool slot share its database, and writers outside
// createTestApplication (provisioning.spec.ts) do not share its cache (#3688).
describe('test applications in one worker', () => {
    it('a later application does not read an entry an earlier one filled', async () => {
        const first = createTestApplication();

        await first.setup();
        await first.container.resolve(TaggedCacheInjectionKey).remember('isolation', async () => 'first', { tags: () => ['isolation'] });
        await first.teardown();

        const second = createTestApplication();

        await second.setup();

        const read = vi.fn(async () => 'second');

        try {
            await expect(second.container.resolve(TaggedCacheInjectionKey).remember('isolation', read, { tags: () => ['isolation'] }))
                .resolves.toEqual('second');
            expect(read).toHaveBeenCalledTimes(1);
        } finally {
            await second.teardown();
        }
    });
});

describe('buildTestRedisOptions', () => {
    it('keeps tls for a rediss url', () => {
        const previous = process.env.TEST_REDIS_URL;

        try {
            process.env.TEST_REDIS_URL = 'rediss://127.0.0.1:6380';
            expect(buildTestRedisOptions()).toMatchObject({
                host: '127.0.0.1', 
                port: 6380, 
                tls: {}, 
            });

            process.env.TEST_REDIS_URL = 'redis://127.0.0.1:6380';
            expect(buildTestRedisOptions()).not.toHaveProperty('tls');
        } finally {
            if (typeof previous === 'undefined') {
                delete process.env.TEST_REDIS_URL;
            } else {
                process.env.TEST_REDIS_URL = previous;
            }
        }
    });
});
