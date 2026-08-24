/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache, Logger } from '@authup/server-kit';
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
import { CacheInjectionKey } from '../../../../../src/app/modules/cache';
import { ComponentsModule } from '../../../../../src/app/modules/components';
import type { Config } from '../../../../../src/app/modules/config';
import { ConfigInjectionKey } from '../../../../../src/app/modules/config';
import { normalizeConfig } from '../../../../../src/app/modules/config/normalize';
import { DatabaseInjectionKey } from '../../../../../src/app/modules/database';
import { LoggerInjectionKey } from '../../../../../src/app/modules/logger';

const flushMicrotasks = async () => {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
};

type ComponentsTestContext = {
    container: Container,
    findMock: ReturnType<typeof vi.fn>,
    infoLines: string[]
};

// The sweeps select expiring ids first and delete them by id, so `find` is
// the call every sweep makes; a `delete` only follows a non-empty batch.
const createContext = (config: Config) : ComponentsTestContext => {
    const findMock = vi.fn().mockResolvedValue([]);
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
            find: findMock,
            delete: vi.fn().mockResolvedValue({ affected: 0 }),
            createQueryBuilder: () => queryBuilder,
        }),
    } as unknown as DataSource;

    // the boot log is the only surface a healthy process writes about the
    // components, so it is asserted rather than discarded.
    const infoLines : string[] = [];
    const logger = createNoopLogger();
    logger.info = ((message: unknown) => {
        infoLines.push(String(message));

        return logger;
    }) as Logger['info'];

    const container = new Container();
    container.register(ConfigInjectionKey, { useValue: config });
    container.register(CacheInjectionKey, { useValue: {} as ICache });
    container.register(DatabaseInjectionKey.DataSource, { useValue: dataSource });
    container.register(LoggerInjectionKey, { useValue: logger });

    return {
        container, 
        findMock, 
        infoLines, 
    };
};

describe('app/modules/components', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('should stop started cron components on teardown', async () => {
        const config = await normalizeConfig({ eventLogEnabled: false });

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'));

        const {
            container, 
            findMock, 
            infoLines, 
        } = createContext(config);

        const module = new ComponentsModule();

        await module.setup(container);
        await flushMicrotasks();

        // the audit log is off, so the event cleaner is not registered and
        // must not be named
        expect(infoLines).toContain('Background components started: oauth2-cleaner.');

        expect(findMock).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(findMock).toHaveBeenCalledTimes(4);

        await module.teardown(container);

        await vi.advanceTimersByTimeAsync(180_000);
        expect(findMock).toHaveBeenCalledTimes(4);
    });

    it('should register no components when they are disabled by config', async () => {
        const config = await normalizeConfig({ componentsEnabled: false });

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'));

        const {
            container, 
            findMock, 
            infoLines, 
        } = createContext(config);

        const module = new ComponentsModule();

        await module.setup(container);
        await flushMicrotasks();

        expect(infoLines).toContain('Background components are disabled by configuration.');
        expect(infoLines.some((line) => line.startsWith('Background components started'))).toBeFalsy();

        expect(findMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(180_000);
        expect(findMock).not.toHaveBeenCalled();

        // teardown must stay safe with nothing registered
        await expect(module.teardown(container)).resolves.toBeUndefined();
    });

    it('should register components regardless of the flag when forced', async () => {
        const config = await normalizeConfig({
            componentsEnabled: false,
            eventLogEnabled: false,
        });

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'));

        const {
            container, 
            findMock, 
            infoLines, 
        } = createContext(config);

        const module = new ComponentsModule({ force: true });

        await module.setup(container);
        await flushMicrotasks();

        expect(infoLines).toContain('Background components started: oauth2-cleaner.');
        expect(findMock).toHaveBeenCalledTimes(2);

        await module.teardown(container);
    });

    it('should name every registered component in the boot log', async () => {
        // The sweeps write nothing per tick and the production console
        // transport is info level, so this line is all an operator gets to
        // tell a working worker from a silent one. It must name what was
        // actually registered, which is why the audit log stays on here.
        const config = await normalizeConfig({});

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'));

        const { container, infoLines } = createContext(config);

        const module = new ComponentsModule();

        await module.setup(container);
        await flushMicrotasks();

        expect(infoLines).toContain('Background components started: oauth2-cleaner, event-cleaner.');

        await module.teardown(container);
    });
});
