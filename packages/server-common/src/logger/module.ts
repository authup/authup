/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { VoidLogger } from './presets';
import { Logger } from './type';

let instance: Logger | undefined;

export function useLogger() : Logger {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new VoidLogger();

    return instance;
}

export function setLogger(logger: Logger) {
    instance = logger;
}
