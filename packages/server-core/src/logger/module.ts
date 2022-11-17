/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Logger } from './type';

let instance: Logger | undefined;

export function useLogger() : Logger | undefined {
    return instance;
}

export function setLogger(logger: Logger) {
    instance = logger;
}
