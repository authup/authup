/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchemaEntryInput } from './types.ts';

type AnySchema = Record<string, ConfigSchemaEntryInput<any, any>>;

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
