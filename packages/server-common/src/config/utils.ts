/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '../utils';
import { ConfigOptionValidatorResult } from './type';

export function isConfigOptionValidatorResult<V>(value: unknown) : value is ConfigOptionValidatorResult<V> {
    return isObject(value) &&
        hasOwnProperty(value, 'success') &&
        typeof value.success === 'boolean' &&
        hasOwnProperty(value, 'data');
}
