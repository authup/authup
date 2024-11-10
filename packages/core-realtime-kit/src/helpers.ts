/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventCallback, EventTarget } from './types';

export function isEventTarget(
    input: unknown,
) : input is EventTarget {
    return typeof input === 'number' ||
        typeof input === 'string' ||
        typeof input === 'undefined';
}

export function isEventCallback(
    input: unknown,
    fnArgs?: number,
) : input is EventCallback {
    if (typeof fnArgs === 'undefined') {
        return typeof input === 'function';
    }

    return typeof input === 'function' &&
        input.length >= fnArgs;
}
