/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { ConfigInjectionKey } from './constants.ts';
import type { IContainer } from 'eldin';
import { readConfig } from './read.ts';
import type { Config, ConfigFactory } from './types.ts';
import type { ConfigRawReadOptions } from '@authup/server-config';

export class ConfigModule implements IModule {
    readonly name: string;

    protected instance : Config | ConfigFactory | undefined;

    // ----------------------------------------------------

    constructor(config?: Config | ConfigFactory) {
        this.name = ModuleName.CONFIG;
        this.instance = config;
    }

    // ----------------------------------------------------

    async setup(container: IContainer): Promise<void> {
        let instance : Config;
        if (typeof this.instance === 'function') {
            instance = await this.instance();
        } else if (this.instance) {
            instance = this.instance;
        } else {
            instance = await this.read();
        }

        container.register(ConfigInjectionKey, { useValue: instance });
    }

    // ----------------------------------------------------

    /**
     * Read config from env and fs.
     *
     * @param options
     */
    async read(options: ConfigRawReadOptions<Config> = {}) : Promise<Config> {
        return readConfig(options);
    }
}
