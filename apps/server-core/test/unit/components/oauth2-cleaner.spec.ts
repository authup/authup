/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
    const deleteMock = vi.fn();

    const dataSource = { getRepository: () => ({ delete: deleteMock }) } as unknown as DataSource;

    beforeEach(() => {
        deleteMock.mockReset();
        deleteMock.mockResolvedValue({ affected: 0 });

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should sweep immediately, per minute, and stop on stop()', async () => {
        const component = createOAuth2CleanerComponent(dataSource);

        await component.start();

        expect(deleteMock).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(deleteMock).toHaveBeenCalledTimes(4);

        await component.stop();

        await vi.advanceTimersByTimeAsync(180_000);
        expect(deleteMock).toHaveBeenCalledTimes(4);
    });

    it('should not schedule the cron task when stopped during the initial sweep', async () => {
        let release : () => void = () => {};
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        deleteMock.mockImplementation(() => gate);

        const component = createOAuth2CleanerComponent(dataSource);

        const started = component.start();
        await component.stop();

        release();
        await started;

        expect(deleteMock).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(180_000);
        expect(deleteMock).toHaveBeenCalledTimes(2);
    });

    it('should tolerate stop() without a prior start()', async () => {
        const component = createOAuth2CleanerComponent(dataSource);

        await expect(component.stop()).resolves.toBeUndefined();
        await flushMicrotasks();
    });
});
