/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { SchemaEntry, SchemaEntryInput } from '../types.ts';
import { isObject } from '@authup/kit';

/**
 * An ENTRY rather than a nested section: it declares a zod type and a
 * description, which a section (a bag of entries) never does at its own
 * level.
 */
export function isSchemaEntryInput(input: unknown) : input is SchemaEntryInput<any, any> {
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

/**
 * The strict shape: `env` and `readEnv` are declared together or not at all,
 * since a variable nothing reads and a reader with no variable are both
 * declarations that never fire.
 */
export function isSchemaEntry(input: unknown) : input is SchemaEntry<any, any> {
    if (!isSchemaEntryInput(input)) {
        return false;
    }

    return (typeof input.env === 'undefined') === (typeof input.readEnv === 'undefined');
}

