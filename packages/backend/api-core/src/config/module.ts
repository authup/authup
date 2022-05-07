/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from './type';
import { findConfig, findConfigSync } from './find';

let instance : Config | undefined;
let instancePromise : Promise<Config> | undefined;

export async function useConfig(directoryPath?: string) : Promise<Config> {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    if (!instancePromise) {
        instancePromise = findConfig(directoryPath);
    }

    instance = await instancePromise;

    return instance;
}

export function useConfigSync(directoryPath?: string) : Config {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = findConfigSync(directoryPath);

    return instance;
}

export function setConfig(value: Config) {
    instance = value;
}
