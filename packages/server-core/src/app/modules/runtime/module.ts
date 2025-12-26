/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type { Module } from '../types.ts';
import type { IDIContainer } from '../../../core/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';
import type { Config } from '../config/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';

export class RuntimeModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const logger = container.resolve<Logger>(LoggerInjectionKey);

        logger.debug(`Environment: ${config.env}`);
        logger.debug(`WritableDirectoryPath: ${config.writableDirectoryPath}`);
        logger.debug(`Port: ${config.port}`);
        logger.debug(`Host: ${config.host}`);
        logger.debug(`Base-URL: ${config.publicUrl}`);
        logger.debug(`Docs-URL: ${new URL('docs', config.publicUrl).href}`);
    }

    // ----------------------------------------------------
}
