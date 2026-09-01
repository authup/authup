/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    toArray,
    toBool,
    toInt,
} from 'envix';
import type { SchemaEnvReader, SchemaInput } from '../types.ts';
import { isSchemaEntryInput } from '../entry/check.ts';
import { readSchemaEntryFromEnv } from '../entry/env.ts';
import { assertSchemaValue, isSchemaInput } from '../schema/check.ts';

const BOOLEAN_TRUE_VALUES = new Set(['true', 't', '1', 'yes', 'y', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['false', 'f', '0', 'no', 'n', 'off']);

/**
 * An empty string is skipped, the key keeps its default.
 */
export const readEnvString : SchemaEnvReader = (raw) => (raw || undefined);

/**
 * Lenient boolean: only true/t/1 and false/f/0 are recognized, anything
 * else is silently skipped.
 */
export const readEnvBool : SchemaEnvReader = (raw) => toBool(raw);

/**
 * Boolean env reader that FAILS LOUD on a set-but-unrecognized value instead
 * of silently falling back to the default (envix's `readBool` swallows e.g.
 * `MFA_REQUIRED=yes`). Reserved for security-relevant toggles where a silent
 * default is a weakened posture. Returns `undefined` when the var is blank.
 */
export const readEnvBoolStrict : SchemaEnvReader = (raw, name) => {
    if (raw.trim().length === 0) {
        return undefined;
    }

    const normalized = raw.trim().toLowerCase();
    if (BOOLEAN_TRUE_VALUES.has(normalized)) {
        return true;
    }
    if (BOOLEAN_FALSE_VALUES.has(normalized)) {
        return false;
    }

    throw new Error(`The environment variable ${name} must be a boolean value (received "${raw}").`);
};

export const readEnvInt : SchemaEnvReader = (raw) => toInt(raw);

/**
 * A comma-separated list; an empty list is skipped.
 */
export const readEnvArray : SchemaEnvReader = (raw) => {
    const value = toArray(raw);
    if (value && value.length > 0) {
        return value;
    }

    return undefined;
};

/**
 * A boolean word switches the service on or off, anything else is a
 * connection string. An empty string is skipped, the key keeps its default.
 */
export const readEnvBoolOrString : SchemaEnvReader = (raw) => toBool(raw) ?? (raw || undefined);

/**
 * The raw (untrimmed) string, skipped when blank. Canonicalized again in
 * normalizeConfig for every config surface; the env read keeps the raw
 * string, the shared canonicalizer decides.
 */
export const readEnvRaw : SchemaEnvReader = (raw) => (raw.trim().length > 0 ? raw : undefined);

/**
 * The values every schema key carrying an environment variable name reads
 * from the environment. A key without one, an unset variable, and a reader
 * answering undefined are all skipped, so the caller's own defaults stand.
 */
export function readSchemaFromEnv<T>(schema: SchemaInput<T>) : Partial<T> {
    const options : Record<string, unknown> = {};

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];
        if (isSchemaEntryInput(entry)) {
            const value = readSchemaEntryFromEnv(entry);
            if (typeof value !== 'undefined') {
                options[key as string] = value;
            }

            continue;
        }

        if (isSchemaInput(entry)) {
            options[key as string] = readSchemaFromEnv<any>(entry);
            continue;
        }

        assertSchemaValue(key as string);
    }

    return options as Partial<T>;
}
