/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import defu from 'defu';
import { Config } from './type';
import {
    applyConfig, extendConfig, findConfigSync, loadConfig,
} from './utils';
import { Subset } from '../types';

let instance : Config | undefined;
let instancePromise : Promise<Config> | undefined;

export async function useConfig(directoryPath?: string) : Promise<Config> {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    if (!instancePromise) {
        instancePromise = loadConfig(directoryPath);
    }

    instance = await instancePromise;
    applyConfig(instance);

    return instance;
}

export function useConfigSync(directoryPath?: string) : Config {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = findConfigSync(directoryPath);
    applyConfig(instance);

    return instance;
}

export function setConfig(value: Subset<Config>) : Config {
    if (instance) {
        // redis client instance can not be merged ;)
        const { redis, ...rest } = value;

        instance = defu(instance, rest);

        if (redis) {
            instance.redis = redis;
        }
    } else {
        instance = extendConfig(value);
    }

    applyConfig(instance);

    return instance;
}
