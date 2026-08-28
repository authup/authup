/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchemaEntryInput } from './types.ts';

type AnySchema = Record<string, ConfigSchemaEntryInput<any, any>>;

/**
 * A section's keys as they appear in a FLAT configuration bag: each name
 * gains the section's own qualifier, so `host` under `adminConsole` becomes
 * `adminConsoleHost`.
 */
export type PrefixKeys<P extends string, T> = {
    [K in keyof T & string as `${P}${Capitalize<K>}`]: T[K]
};

function capitalize(value: string) : string {
    return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * Fill in the document location of every entry that does not spell one: the
 * section it belongs to, plus its own key name.
 *
 * A section is declared in the vocabulary of the service it configures
 * (`url`, `port`, `host`), never with the location repeated per entry, so a
 * key cannot end up at a path its section does not own. An entry that DOES
 * spell a path keeps it, which is how a key reaches outside its section: a
 * fallback chain into the deployment-wide location it inherits from.
 */
export function withSectionPaths<S extends AnySchema>(section: string, schema: S) : S {
    const output : AnySchema = {};

    const keys = Object.keys(schema);
    for (const key of keys) {
        const entry = schema[key];

        output[key] = {
            ...entry,
            path: entry.path ?? (section ? `${section}.${key}` : key),
        };
    }

    return output as S;
}

/**
 * Qualify every key of a section registry with the section's own name.
 *
 * Everything that merges several sections into one bag needs unique names:
 * the document schema itself, and server-core, which reads five console keys
 * next to its own. The section keeps declaring `url` and `host`; only the
 * merged view says `adminConsoleUrl` and `adminConsoleHost`, and it says so
 * by derivation rather than by a second declaration.
 */
export function prefixSchemaKeys<P extends string, S extends AnySchema>(
    prefix: P,
    schema: S,
) : PrefixKeys<P, S> {
    const output : AnySchema = {};

    const keys = Object.keys(schema);
    for (const key of keys) {
        output[`${prefix}${capitalize(key)}`] = schema[key];
    }

    return output as PrefixKeys<P, S>;
}
