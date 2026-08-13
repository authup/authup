/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createLogger, createNoopLogger } from '@authup/server-kit';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import { LoggerInjectionKey } from './constants.ts';
import type { IContainer } from 'eldin';

export class LoggerModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.LOGGER;
        this.dependencies = [ModuleName.CONFIG];
    }

    async setup(container: IContainer): Promise<void> {
        // A pre-registered logger wins (test injection, mirroring the
        // MailInjectionKey / UIHttpClient pattern), so a fake can capture
        // what the server writes.
        if (container.has(LoggerInjectionKey)) {
            return;
        }

        const result = container.tryResolve(ConfigInjectionKey);
        if (!result.success || !result.data.logger) {
            container.register(LoggerInjectionKey, { useFactory: createNoopLogger });

            return;
        }

        container.register(LoggerInjectionKey, {
            useFactory: () => createLogger({
                env: result.data.env,
                directory: result.data.writableDirectoryPath,
            }),
        });
    }

    // ----------------------------------------------------
}
