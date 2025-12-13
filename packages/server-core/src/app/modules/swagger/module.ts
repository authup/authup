/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Swagger } from '../../../adapters/http';
import type { ModuleContextContainer } from '../context';
import type { ApplicationModule } from '../types';

export class SwaggerModule implements ApplicationModule {
    protected container : ModuleContextContainer;

    // ----------------------------------------------------

    constructor(container: ModuleContextContainer) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const config = this.container.require('config');
        const logger = this.container.require('logger');

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
