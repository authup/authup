/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DependencyContainer } from '../../../core';
import type { ApplicationModule, ApplicationModuleContext } from '../types';

export class RuntimeModule implements ApplicationModule {
    protected container : DependencyContainer<ApplicationModuleContext>;

    // ----------------------------------------------------

    constructor(container: DependencyContainer<ApplicationModuleContext>) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const config = this.container.resolve('config');
        const logger = this.container.resolve('logger');

        logger.info(`Environment: ${config.env}`);
        logger.info(`WritableDirectoryPath: ${config.writableDirectoryPath}`);
        logger.info(`Port: ${config.port}`);
        logger.info(`Host: ${config.host}`);
        logger.info(`Public-URL: ${config.publicUrl}`);
        logger.info(`Docs-URL: ${new URL('docs', config.publicUrl).href}`);
    }

    // ----------------------------------------------------
}
