/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createLogger, setLoggerFactory } from '@authup/server-kit';
import type { Module } from '../types.ts';
import type { Config } from '../config/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import { LoggerInjectionKey } from './constants.ts';
import type { IDIContainer } from '../../../core/index.ts';

export class LoggerModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        const result = container.safeResolve<Config>(ConfigInjectionKey);
        if (!result.success || !result.data.logger) {
            return;
        }

        container.register(LoggerInjectionKey, {
            useFactory: () => createLogger({
                env: result.data.env,
                directory: result.data.writableDirectoryPath,
            }),
        });

        // todo: remove this
        setLoggerFactory(() => createLogger({
            env: result.data.env,
            directory: result.data.writableDirectoryPath,
        }));
    }

    // ----------------------------------------------------
}
