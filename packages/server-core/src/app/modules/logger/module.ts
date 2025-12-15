/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createLogger, setLoggerFactory } from '@authup/server-kit';
import type { Module } from '../types';
import type { Config } from '../../../config';
import { ConfigInjectionKey } from '../config';
import { LoggerInjectionKey } from './constants';
import type { IDIContainer } from '../../../core/di/types';

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
