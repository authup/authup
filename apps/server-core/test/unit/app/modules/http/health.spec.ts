/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import {
    createDatabaseHealthCheck,
    createShutdownHealthCheck,
    runHealthChecks,
} from '../../../../../src/app/modules/http/health';

describe('app/modules/http/health', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('should report healthy with no checks', async () => {
        expect(await runHealthChecks([])).toEqual({ healthy: true, checks: [] });
    });

    it('should report each check by name and fail on a false or a rejection', async () => {
        const report = await runHealthChecks([
            { name: 'a', run: () => true },
            { name: 'b', run: () => false },
            { name: 'c', run: () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.1:5432')) },
        ]);

        expect(report).toEqual({
            healthy: false,
            checks: [
                { name: 'a', ok: true },
                { name: 'b', ok: false },
                { name: 'c', ok: false },
            ],
        });
    });

    it('should follow the shutdown state', async () => {
        const state = { active: false };
        const check = createShutdownHealthCheck(state);

        expect(await check.run()).toBeTruthy();

        state.active = true;

        expect(await check.run()).toBeFalsy();
    });

    it('should pass while the database answers and fail when the query rejects', async () => {
        const query = vi.fn().mockResolvedValue([{ 1: 1 }]);

        expect(await createDatabaseHealthCheck({ query }).run()).toBeTruthy();
        expect(query).toHaveBeenCalledWith('SELECT 1');

        query.mockRejectedValue(new Error('gone'));

        expect(await createDatabaseHealthCheck({ query }).run()).toBeFalsy();
    });

    it('should fail when the database does not answer within the timeout', async () => {
        vi.useFakeTimers();

        const query = vi.fn().mockReturnValue(new Promise(() => {}));
        const result = createDatabaseHealthCheck({ query }, { timeout: 1_000 }).run();

        await vi.advanceTimersByTimeAsync(1_000);

        expect(await result).toBeFalsy();
    });

    it('should not issue another query while a timed-out one is still outstanding', async () => {
        vi.useFakeTimers();

        const stalled = Promise.withResolvers<unknown>();
        const query = vi.fn().mockReturnValue(stalled.promise);
        const check = createDatabaseHealthCheck({ query }, { timeout: 1_000, ttl: 1_000 });

        for (let i = 0; i < 5; i++) {
            const result = check.run();

            await vi.advanceTimersByTimeAsync(1_000);
            expect(await result).toBeFalsy();

            // past the ttl, so the next probe is not served from the cache
            await vi.advanceTimersByTimeAsync(1_001);
        }

        expect(query).toHaveBeenCalledTimes(1);

        // once it settles, the next probe pings again
        stalled.resolve([]);
        await vi.advanceTimersByTimeAsync(1_001);

        query.mockResolvedValue([]);

        expect(await check.run()).toBeTruthy();
        expect(query).toHaveBeenCalledTimes(2);
    });

    it('should run one query for concurrent probes and reuse the result within the ttl', async () => {
        vi.useFakeTimers();

        const query = vi.fn().mockResolvedValue([]);
        const check = createDatabaseHealthCheck({ query }, { ttl: 1_000 });

        expect(await Promise.all([check.run(), check.run(), check.run()])).toEqual([true, true, true]);
        expect(await check.run()).toBeTruthy();
        expect(query).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1_001);

        query.mockRejectedValue(new Error('gone'));

        expect(await check.run()).toBeFalsy();
        expect(query).toHaveBeenCalledTimes(2);
    });
});
