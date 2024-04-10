/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SocketClientToServerEventCallback, SocketClientToServerEventErrorCallback, SocketClientToServerEventTarget } from './type';

export function isSocketClientToServerEventTarget(
    input: unknown,
) : input is SocketClientToServerEventTarget {
    return typeof input === 'number' ||
        typeof input === 'string' ||
        typeof input === 'undefined';
}
export function isSocketClientToServerEventCallback(
    input: unknown,
) : input is SocketClientToServerEventCallback {
    return typeof input === 'function';
}

export function isSocketClientToServerEventErrorCallback(
    input: unknown,
) : input is SocketClientToServerEventErrorCallback {
    return !isSocketClientToServerEventCallback(input) || input.length < 1;
}
