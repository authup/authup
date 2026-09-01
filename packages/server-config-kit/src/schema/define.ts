/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { SCHEMA_SYMBOL } from '../constants.ts';
import type { Schema, SchemaDefineOptions } from '../types.ts';
import { isSchemaEntryInput } from '../entry/index.ts';

/**
 * Declare an object to BE a schema (a registry), and stamp the document
 * location of the keys it holds.
 *
 * A schema and one key's entry are both plain objects, and so is the VALUE of
 * a config key like `db`, `redis` or `smtp`. Which of the three an object is
 * cannot be read off its shape without guessing, so it is declared. EVERY
 * registry goes through here, the document root and a hand-built selection
 * included: the predecessor marker was a side effect of the path-stamping
 * helper, which only the qualified sections called, so the root section could
 * never carry it (it has no prefix to stamp) and the shape guess decided for
 * it anyway.
 *
 * The marker is symbol-keyed and NON-enumerable, so it is invisible to
 * `Object.keys`, to `JSON.stringify` and therefore to every pass. That also
 * means a SPREAD drops it: `{ ...SCHEMA }` is a new object and a new
 * declaration, which is why a registry composed out of others declares
 * itself again.
 *
 * `pathPrefix` fills in the absolute location of every entry that spells
 * none, so a section declares its keys in the vocabulary of the service it
 * configures (`url`, `port`, `host`) and cannot land them where it does not
 * own. An entry that DOES spell a path keeps it.
 *
 * The parameter type is the exhaustiveness guard: a key of `T` with no entry
 * fails the build here, at the declaration. The cost is that the return type
 * is the declared `Schema<T, D, E>` rather than the argument's literal type,
 * so `T`, `D` and `E` are supplied explicitly at every call site. Inferring
 * them instead collapses `E` to `string` and reconstructs `T` structurally,
 * which the nested sections of a composed document then reject.
 */
export function defineSchema<
    T,
    D extends keyof T = never,
    E extends string = string,
>(
    schema: Schema<T, D, E>,
    options: SchemaDefineOptions = {},
) : Schema<T, D, E> {
    // configurable, so declaring the same object twice is a no-op rather
    // than a TypeError. It is one composed registry reaching two services.
    Object.defineProperty(schema, SCHEMA_SYMBOL, {
        value: true,
        enumerable: false,
        configurable: true,
    });

    if (options.pathPrefix) {
        const keys = Object.keys(schema) as (keyof Schema<T, D, E>)[];
        for (const key of keys) {
            const entry = schema[key];

            if (isSchemaEntryInput(entry)) {
                schema[key] = {
                    ...entry,
                    path: entry.path ?? (options.pathPrefix ? `${options.pathPrefix}.${String(key)}` : key),
                };
            }
        }
    }

    return schema;
}
