/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Factory, singa } from 'singa';
import type { Logger } from 'winston';

export type {
    Logger,
};
const instance = singa<Logger>({
    name: 'logger',
});

export function setLoggerFactory(factory: Factory<Logger>) {
    instance.setFactory(factory);
}

export function isLoggerUsable() {
    return instance.has() || instance.hasFactory();
}

export function setLogger(input: Logger) {
    instance.set(input);
}

export function useLogger() {
    return instance.use();
}
