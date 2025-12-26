/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Module } from '../types.ts';
import { ConfigInjectionKey } from './constants.ts';
import type { IDIContainer } from '../../../core/index.ts';
import { normalizeConfig } from './normalize.ts';
import type { ConfigRawReadOptions } from './read/index.ts';
import { readConfigRaw } from './read/index.ts';
import type { Config } from './types.ts';

export class ConfigModule implements Module {
    protected instance : Config | undefined;

    // ----------------------------------------------------

    constructor(config?: Config) {
        this.instance = config;
    }

    // ----------------------------------------------------

    async start(container: IDIContainer): Promise<void> {
        let instance : Config;
        if (this.instance) {
            instance = this.instance;
        } else {
            instance = await this.read();
        }

        container.register(ConfigInjectionKey, {
            useValue: instance,
        });
    }

    // ----------------------------------------------------

    /**
     * Read config from env and fs.
     *
     * @param options
     */
    async read(options: ConfigRawReadOptions = {}) : Promise<Config> {
        const raw = await readConfigRaw({
            env: true,
            ...options,
        });

        return normalizeConfig(raw);
    }
}
