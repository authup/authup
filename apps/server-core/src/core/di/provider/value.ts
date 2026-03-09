/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';

export interface DIValueProvider<T> {
    useValue: T
}

export function isValueProvider<T>(input: unknown) : input is DIValueProvider<T> {
    return isObject(input) && typeof input.useValue !== 'undefined';
}
