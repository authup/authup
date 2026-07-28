/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNoopLogger } from '@authup/server-kit';
import { Container } from 'eldin';
import type { DataSource } from 'typeorm';
import {
    afterEach, 
    describe, 
    expect, 
    it, 
    vi,
} from 'vitest';
import { ComponentsModule } from '../../../../../src/app/modules/components';
import { ConfigInjectionKey } from '../../../../../src/app/modules/config';
import { normalizeConfig } from '../../../../../src/app/modules/config/normalize';
import { DatabaseInjectionKey } from '../../../../../src/app/modules/database';
import { LoggerInjectionKey } from '../../../../../src/app/modules/logger';

const flushMicrotasks = async () => {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
};

describe('app/modules/components', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('should stop started cron components on teardown', async () => {
        const config = await normalizeConfig({ eventLogEnabled: false });

        const deleteMock = vi.fn().mockResolvedValue({ affected: 0 });
        const queryBuilder = {
            orderBy() {
                return this;
            },
            async getMany() {
                return [];
            },
        };
        const dataSource = {
            getRepository: () => ({
                delete: deleteMock,
                createQueryBuilder: () => queryBuilder,
            }),
        } as unknown as DataSource;

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'));

        const container = new Container();
        container.register(ConfigInjectionKey, { useValue: config });
        container.register(DatabaseInjectionKey.DataSource, { useValue: dataSource });
        container.register(LoggerInjectionKey, { useValue: createNoopLogger() });

        const module = new ComponentsModule();

        await module.setup(container);
        await flushMicrotasks();

        expect(deleteMock).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(deleteMock).toHaveBeenCalledTimes(4);

        await module.teardown(container);

        await vi.advanceTimersByTimeAsync(180_000);
        expect(deleteMock).toHaveBeenCalledTimes(4);
    });
});
