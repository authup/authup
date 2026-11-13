/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'eldin';
import process from 'node:process';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { Config, ShutdownState } from '../../../src/app';
import { ConfigInjectionKey, HTTPInjectionKey } from '../../../src/app';
import { buildShutdownHandlersOptions, registerShutdownHandlers } from '../../../src/cli/commands/shutdown';

type SignalHandler = (signal: NodeJS.Signals) => Promise<void>;

function captureSignalHandler() : () => SignalHandler {
    const handlers : SignalHandler[] = [];

    vi.spyOn(process, 'on').mockImplementation(((event: string, handler: SignalHandler) => {
        if (event === 'SIGTERM') {
            handlers.push(handler);
        }

        return process;
    }) as never);

    return () => handlers[0];
}

describe('cli/commands/shutdown', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should tear down at once without a delay', async () => {
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        const handler = captureSignalHandler();
        const teardown = vi.fn().mockResolvedValue(undefined);

        registerShutdownHandlers({ teardown });

        await handler()('SIGTERM');

        expect(teardown).toHaveBeenCalledTimes(1);
        expect(exit).toHaveBeenCalledWith(0);
    });

    it('should signal first and hold the teardown back for the delay', async () => {
        vi.useFakeTimers();

        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        const handler = captureSignalHandler();
        const teardown = vi.fn().mockResolvedValue(undefined);
        const onSignal = vi.fn();

        registerShutdownHandlers({ teardown }, { onSignal, delay: 5_000 });

        const done = handler()('SIGTERM');

        expect(onSignal).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(4_999);
        expect(teardown).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        await done;

        expect(teardown).toHaveBeenCalledTimes(1);
        expect(exit).toHaveBeenCalledWith(0);
    });

    it('should exit immediately on a second signal during the delay', async () => {
        vi.useFakeTimers();

        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        const handler = captureSignalHandler();
        const teardown = vi.fn().mockResolvedValue(undefined);

        registerShutdownHandlers({ teardown }, { delay: 5_000 });

        handler()('SIGTERM');
        handler()('SIGTERM');

        expect(exit).toHaveBeenCalledWith(1);
        expect(teardown).not.toHaveBeenCalled();
    });

    it('should flip the shutdown state and read the delay from core.shutdownDelay', () => {
        const container = new Container();
        const state : ShutdownState = { active: false };

        container.register(ConfigInjectionKey, { useValue: { shutdownDelay: 7 } as Config });
        container.register(HTTPInjectionKey.ShutdownState, { useValue: state });

        const options = buildShutdownHandlersOptions(container);

        expect(options.delay).toEqual(7_000);

        options.onSignal!();

        expect(state.active).toBeTruthy();
    });

    it('should build options for an application without a listener of its own', () => {
        const container = new Container();

        container.register(ConfigInjectionKey, { useValue: { shutdownDelay: 0 } as Config });

        const options = buildShutdownHandlersOptions(container);

        expect(options.delay).toEqual(0);
        expect(() => options.onSignal!()).not.toThrow();
    });
});
