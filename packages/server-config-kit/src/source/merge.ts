/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isSchemaEntryInput } from '../entry/check.ts';
import { assertSchemaValue, isSchemaInput } from '../schema/check.ts';
import type { SchemaInput } from '../types.ts';

/**
 * Layer the passes over a registry onto one another, lowest precedence
 * first: defaults, then the configuration file, then the environment.
 *
 * A plain spread cannot do it once the registry has sections. Each pass
 * yields a value shaped like the config, so a later pass carrying one key of
 * a section (`PORT` alone) would REPLACE the whole section object and take
 * every other key's file value and default with it. The merge is therefore
 * schema-aware: it recurses exactly where the registry declares a section,
 * and treats every other value as one value, so an array or a connection
 * object is replaced rather than merged element by element.
 */
export function mergeSchemaData<T>(
    schema: SchemaInput<T>,
    ...sources: Partial<T>[]
) : Partial<T> {
    const output : Record<string, unknown> = {};

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];
        const name = key as string;

        if (isSchemaInput(entry)) {
            const sections = sources
                .map((source) => (source as Record<string, unknown>)[name])
                .filter((value) : value is Partial<T[keyof T]> => typeof value !== 'undefined');

            output[name] = mergeSchemaData<any>(entry, ...sections);

            continue;
        }

        if (!isSchemaEntryInput(entry)) {
            assertSchemaValue(name);
        }

        for (let i = sources.length - 1; i >= 0; i--) {
            const value = (sources[i] as Record<string, unknown>)[name];
            if (typeof value !== 'undefined') {
                output[name] = value;
                break;
            }
        }
    }

    return output as Partial<T>;
}
