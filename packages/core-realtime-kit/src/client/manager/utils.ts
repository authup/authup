/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { DisconnectDescription } from '../../types';
import type { ClientManagerTokenFn } from './types';

export function toClientManagerTokenAsyncFn(input?: string | ClientManagerTokenFn) {
    if (typeof input === 'undefined') {
        return () => undefined;
    }

    if (typeof input === 'string') {
        return () => input;
    }

    return input;
}

export function isDisconnectDescription(input: unknown) : input is DisconnectDescription {
    return isObject(input) &&
        typeof input.description === 'string';
}
