/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Module } from '../types';
import { ConfigInjectionKey } from './constants';
import type { IDIContainer } from '../../../core';
import { normalizeConfig } from './normalize';
import type { ConfigRawReadOptions } from './read';
import { readConfigRaw } from './read';
import type { Config } from './types';

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
