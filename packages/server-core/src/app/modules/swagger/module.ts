/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Swagger } from '../../../adapters/http';
import type { DependencyContainer } from '../../../core';
import type { ApplicationModule, ApplicationModuleContext } from '../types';

export class SwaggerModule implements ApplicationModule {
    protected container : DependencyContainer<ApplicationModuleContext>;

    // ----------------------------------------------------

    constructor(container: DependencyContainer<ApplicationModuleContext>) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const config = this.container.resolve('config');
        const logger = this.container.resolve('logger');

        const swagger = new Swagger({
            baseURL: config.publicUrl,
        });

        const swaggerCanGenerate = await swagger.canGenerate();
        const swaggerExists = await swagger.exists();
        if (swaggerCanGenerate && !swaggerExists) {
            logger.info('Generating documentation...');

            await swagger.generate();

            logger.info('Generated documentation.');
        }
    }

    // ----------------------------------------------------
}
