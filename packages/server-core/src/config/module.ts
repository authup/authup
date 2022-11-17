/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import { Config, ConfigInput } from './type';
import {
    buildConfig,
    findConfig,
    findConfigSync,
} from './utils';

let instance : Config | undefined;
let instancePromise : Promise<ConfigInput> | undefined;

/**
 * Load and build the configuration asynchronous.
 *
 * @param directoryPath
 */

export async function useConfig(directoryPath?: string) : Promise<Config> {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    if (!instancePromise) {
        instancePromise = findConfig(directoryPath);
    }

    instance = buildConfig(await instancePromise);

    return instance;
}

/**
 * Load and build the configuration synchronous.
 *
 * @param directoryPath
 */
export function useConfigSync(directoryPath?: string) : Config {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = buildConfig(findConfigSync(directoryPath));

    return instance;
}

/**
 * Set or extend an existing configuration.
 *
 * @param value
 */
export function setConfig(value: ConfigInput) : Config {
    if (instance) {
        const merged = merge({}, value, instance);

        instance = buildConfig(merged);
    } else {
        instance = buildConfig(value);
    }

    return instance;
}

/**
 * Reset configuration.
 */
export function resetConfig() {
    instance = undefined;
}
