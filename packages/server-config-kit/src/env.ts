/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    read,
    toArray,
    toBool,
    toInt,
} from 'envix';
import type { ConfigSchemaEnvReader, ConfigSchemaInput } from './types.ts';
import { isConfigSchemaEntryInput, isConfigSchemaInput } from './check.ts';

const BOOLEAN_TRUE_VALUES = new Set(['true', 't', '1', 'yes', 'y', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['false', 'f', '0', 'no', 'n', 'off']);

/**
 * An empty string is skipped, the key keeps its default.
 */
export const readEnvString : ConfigSchemaEnvReader = (raw) => (raw || undefined);

/**
 * Lenient boolean: only true/t/1 and false/f/0 are recognized, anything
 * else is silently skipped.
 */
export const readEnvBool : ConfigSchemaEnvReader = (raw) => toBool(raw);

/**
 * Boolean env reader that FAILS LOUD on a set-but-unrecognized value instead
 * of silently falling back to the default (envix's `readBool` swallows e.g.
 * `MFA_REQUIRED=yes`). Reserved for security-relevant toggles where a silent
 * default is a weakened posture. Returns `undefined` when the var is blank.
 */
export const readEnvBoolStrict : ConfigSchemaEnvReader = (raw, name) => {
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

export const readEnvInt : ConfigSchemaEnvReader = (raw) => toInt(raw);

/**
 * A comma-separated list; an empty list is skipped.
 */
export const readEnvArray : ConfigSchemaEnvReader = (raw) => {
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
export const readEnvBoolOrString : ConfigSchemaEnvReader = (raw) => toBool(raw) ?? (raw || undefined);

/**
 * The raw (untrimmed) string, skipped when blank. Canonicalized again in
 * normalizeConfig for every config surface; the env read keeps the raw
 * string, the shared canonicalizer decides.
 */
export const readEnvRaw : ConfigSchemaEnvReader = (raw) => (raw.trim().length > 0 ? raw : undefined);

/**
 * Every environment variable a key may be read from, in the order they are
 * tried. A single declared name is a chain of one.
 */
export function resolveSchemaEnvNames(entry: { env?: string | string[] }) : string[] {
    if (typeof entry.env === 'undefined') {
        return [];
    }

    return Array.isArray(entry.env) ? entry.env : [entry.env];
}

/**
 * The values every schema key carrying an environment variable name reads
 * from the environment. A key without one, an unset variable, and a reader
 * answering undefined are all skipped, so the caller's own defaults stand.
 */
export function readSchemaFromEnv<T>(schema: ConfigSchemaInput<T>) : Partial<T> {
    const options : Record<string, unknown> = {};

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];
        if (isConfigSchemaEntryInput(entry)) {
            if (!entry.env || !entry.readEnv) {
                continue;
            }

            // a chain is tried in order, first set wins, and the reader is told
            // which variable the value came from: its diagnostics name the
            // variable an operator actually set.
            for (const name of resolveSchemaEnvNames(entry)) {
                const raw = read(name);
                if (typeof raw !== 'string') {
                    continue;
                }

                const value = entry.readEnv(raw, name);
                if (typeof value !== 'undefined') {
                    options[key as string] = value;
                    break;
                }
            }
        }

        if (isConfigSchemaInput(entry)) {
            options[key as string] = readSchemaFromEnv(entry);
        }
    }

    return options as Partial<T>;
}
