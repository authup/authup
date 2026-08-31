/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { SCHEMA_SYMBOL } from '../constants.ts';
import { isObject } from '@authup/kit';
import type { SchemaEntryInput, SchemaInput } from '../types.ts';

/**
 * A registry value is one key's entry or a nested schema, and nothing else.
 * A pass that met a third thing used to skip it, so a nested schema nobody
 * declared vanished from the environment read, the file read, the defaults
 * and the validator mounts alike, in silence and at every layer at once.
 */
export function assertSchemaValue(key: string) : never {
    throw new Error(
        `The config key "${key}" is neither an entry nor a schema. ` +
        'An entry declares a zod `type` and a `description`; a nested schema ' +
        'has to be declared with defineSchema().',
    );
}

type AnySchema = Record<string, SchemaEntryInput<any, any>>;

/**
 * Whether an object was declared a schema by {@link defineSchema}.
 *
 * This is an identity check, not a validation: the declaration is what makes
 * the object a registry, so there is nothing to re-derive by walking it.
 */
export function isSchema(input: unknown) : input is AnySchema {
    return isObject(input) &&
        (input as Record<symbol, unknown>)[SCHEMA_SYMBOL] === true;
}

/**
 * A nested SCHEMA rather than one key's entry.
 *
 * Decided by the declaration {@link defineSchema} leaves behind, never
 * by shape: a config key whose VALUE is an object (a database, redis or smtp
 * connection) is an entry, and no walk over it can tell the two apart
 * without guessing.
 */
export function isSchemaInput(input: unknown): input is SchemaInput<any> {
    return isSchema(input);
}
