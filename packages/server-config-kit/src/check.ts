/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchemaEntry, ConfigSchemaEntryInput, ConfigSchemaInput } from './types.ts';
import { isObject } from '@authup/kit';

export function isConfigSchemaEntryInput(input: unknown) : input is ConfigSchemaEntryInput<any, any> {
    if (!isObject(input)) {
        return false;
    }

    if (typeof input.type === 'undefined') {
        return false;
    }

    if (typeof input.description !== 'string') {
        return false;
    }

    return true;
}

export function isConfigSchemaEntry(input: unknown) : input is ConfigSchemaEntry<any, any> {
    if (!isConfigSchemaEntryInput(input)) {
        return false;
    }

    if (typeof input.env === 'undefined') {
        return typeof input.readEnv !== 'undefined';
    }

    if (typeof input.readEnv === 'undefined') {
        return typeof input.env !== 'undefined';
    }

    return true;
}

export function isConfigSchemaInput(input: unknown) : input is ConfigSchemaInput<any> {
    if (!isObject(input)) {
        return false;
    }

    const keys = Object.keys(input);
    for (const key of keys) {
        if (!isConfigSchemaEntryInput(input[key]) &&  !isConfigSchemaInput(input[key])) {
            return false;
        }
    }

    return true;
}
