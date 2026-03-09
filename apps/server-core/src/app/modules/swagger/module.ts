/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import { Swagger } from '../../../adapters/http/index.ts';
import type { Module } from '../types.ts';
import type { IDIContainer } from '../../../core/index.ts';
import type { Config } from '../config/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';

export class SwaggerModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const logger = container.resolve<Logger>(LoggerInjectionKey);

        const swagger = new Swagger({
            baseURL: config.publicUrl,
        });

        const swaggerCanGenerate = await swagger.canGenerate();
        const swaggerExists = await swagger.exists();
        if (swaggerCanGenerate && !swaggerExists) {
            logger.debug('Generating documentation...');

            await swagger.generate();

            logger.debug('Generated documentation.');
        }
    }

    // ----------------------------------------------------
}
