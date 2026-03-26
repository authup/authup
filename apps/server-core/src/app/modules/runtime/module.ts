/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IModule } from '../types.ts';
import { ModuleName } from '../constants.ts';
import type { IContainer } from 'eldin';
import { LoggerInjectionKey } from '../logger/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';

export class RuntimeModule implements IModule {
    readonly name: string;

    readonly dependsOn: string[];

    constructor() {
        this.name = ModuleName.RUNTIME;
        this.dependsOn = [ModuleName.CONFIG, ModuleName.LOGGER];
    }

    async start(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const logger = container.resolve(LoggerInjectionKey);

        logger.debug(`Environment: ${config.env}`);
        logger.debug(`WritableDirectoryPath: ${config.writableDirectoryPath}`);
        logger.debug(`Port: ${config.port}`);
        logger.debug(`Host: ${config.host}`);
        logger.debug(`Base-URL: ${config.publicUrl}`);
        logger.debug(`Docs-URL: ${new URL('docs', config.publicUrl).href}`);
    }

    // ----------------------------------------------------
}
