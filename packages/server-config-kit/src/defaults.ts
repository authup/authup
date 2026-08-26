/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchemaInput } from './types.ts';

/**
 * The static defaults of every key that carries one. A function-valued
 * default is called; a key declared without one (a derived key) is absent.
 * An array-valued default is copied, so two configurations built from one
 * schema never share the same instance.
 */
export function buildSchemaDefaults<T>(schema: ConfigSchemaInput<T>) : Partial<T> {
    const defaults : Record<string, unknown> = {};

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const value : unknown = schema[key].default;
        if (typeof value === 'undefined') {
            continue;
        }

        const resolved : unknown = typeof value === 'function' ? value() : value;

        defaults[key as string] = Array.isArray(resolved) ? [...resolved] : resolved;
    }

    return defaults as Partial<T>;
}
