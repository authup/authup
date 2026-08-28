/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchemaInput } from './types.ts';
import { isConfigSchemaEntryInput, isConfigSchemaInput } from './check.ts';
import { hasOwnProperty } from '@authup/kit';

/**
 * The static defaults of every key that carries one. A function-valued
 * default is called; a key declared without one (a derived key) is absent.
 * An array-valued default is copied, so two configurations built from one
 * schema never share the same instance.
 */
export function buildSchemaDefaults<T>(schema: ConfigSchemaInput<T>) : Partial<T> {
    const defaults : Record<string, unknown> = {};

    const keys = Object.keys(schema) as (keyof ConfigSchemaInput<T>)[];
    for (const key of keys) {
        if (!hasOwnProperty(schema, key)) {
            continue;
        }

        const data = schema[key];

        if (isConfigSchemaEntryInput(data)) {
            const value: unknown = data.default;
            if (typeof value === 'undefined') {
                continue;
            }

            const resolved: unknown = typeof value === 'function' ? value() : value;

            defaults[key as string] = Array.isArray(resolved) ? [...resolved] : resolved;

            continue;
        }

        if (isConfigSchemaInput(data)) {
            defaults[key as string] = buildSchemaDefaults(data);
        }
    }

    return defaults as Partial<T>;
}
