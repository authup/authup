/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import defu from 'defu';
import { Config } from './type';
import { findConfigSync, loadConfig } from './find';
import { extendConfig } from './extend';
import { Subset } from '../types';
import { applyConfig } from './apply';

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
        instance = defu(instance, value);
    } else {
        instance = extendConfig(value);
    }
    applyConfig(instance);

    return instance;
}
