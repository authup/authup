/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { createOAuth2CleanerComponent } from '../../../src/components';

const flushMicrotasks = async () => {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
};

describe('components/oauth2-cleaner', () => {
    // The sweep selects expiring ids first and deletes them by id, so `find`
    // is the call every sweep makes; a `delete` only follows a non-empty
    // batch. Counting finds therefore counts sweeps on an empty table too.
    const findMock = vi.fn();
    const deleteMock = vi.fn();

    const dataSource = {
        getRepository: () => ({
            find: findMock,
            delete: deleteMock,
        }),
    } as unknown as DataSource;
    const cache = {} as ICache;

    beforeEach(() => {
        findMock.mockReset();
        findMock.mockResolvedValue([]);

        deleteMock.mockReset();
        deleteMock.mockResolvedValue({ affected: 0 });

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should sweep immediately, per minute, and stop on stop()', async () => {
        const component = createOAuth2CleanerComponent(dataSource, cache);

        await component.start();

        expect(findMock).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(findMock).toHaveBeenCalledTimes(4);

        await component.stop();

        await vi.advanceTimersByTimeAsync(180_000);
        expect(findMock).toHaveBeenCalledTimes(4);
    });

    it('should sweep both tables through the batched delete-by-id path', async () => {
        // The regression this guards: a predicate DELETE over the whole
        // expired set, on the two tables that grow fastest. Each table must
        // be swept by a BOUNDED select feeding a delete restricted to the
        // ids it returned.
        findMock
            .mockResolvedValueOnce([{ id: 'token-a' }])
            .mockResolvedValueOnce([{ id: 'session-a' }]);
        deleteMock.mockResolvedValue({ affected: 1 });

        const component = createOAuth2CleanerComponent(dataSource, cache);

        await component.start();
        await component.stop();

        expect(findMock).toHaveBeenCalledTimes(2);
        for (const [options] of findMock.mock.calls) {
            expect(options?.take).toBeGreaterThan(0);
        }

        expect(deleteMock).toHaveBeenCalledTimes(2);
        for (const [where] of deleteMock.mock.calls) {
            expect(Object.keys(where)).toEqual(['id']);
        }
    });

    it('should keep sweeping after a failed sweep', async () => {
        // start() is fire-and-forget, so a rejection escaping the sweep is
        // fatal on modern node. The next tick must simply retry.
        findMock.mockRejectedValueOnce(new Error('connection lost'));

        const component = createOAuth2CleanerComponent(dataSource, cache);

        await component.start();
        expect(findMock).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(findMock).toHaveBeenCalledTimes(3);

        await component.stop();
    });

    it('should not schedule the cron task when stopped during the initial sweep', async () => {
        let release : () => void = () => {};
        const gate = new Promise<[]>((resolve) => {
            release = () => resolve([]);
        });
        findMock.mockImplementation(() => gate);

        const component = createOAuth2CleanerComponent(dataSource, cache);

        const started = component.start();
        await component.stop();

        release();
        await started;

        expect(findMock).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(180_000);
        expect(findMock).toHaveBeenCalledTimes(2);
    });

    it('should tolerate stop() without a prior start()', async () => {
        const component = createOAuth2CleanerComponent(dataSource, cache);

        await expect(component.stop()).resolves.toBeUndefined();
        await flushMicrotasks();
    });
});
