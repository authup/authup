/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Swagger } from '../../../adapters/http/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import type { IContainer } from 'eldin';
import { ConfigInjectionKey } from '../config/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';

export class SwaggerModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.SWAGGER;
        this.dependencies = [ModuleName.CONFIG, ModuleName.LOGGER];
    }

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const logger = container.resolve(LoggerInjectionKey);

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
