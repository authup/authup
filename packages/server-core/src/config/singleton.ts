/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config } from './types';

let instance : Config | undefined;

export function useConfig() : Config {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    throw new Error('The config hasn\'t been setup yet.');
}

export function setConfig(config: Config) {
    instance = config;
}

export function unsetConfig() {
    if (typeof instance === 'undefined') {
        return;
    }

    instance = undefined;
}
