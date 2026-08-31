/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import type { SchemaEntryInput } from '../types.ts';

/**
 * The environment variable a key is read from, if it declares one. A list
 * because callers describe a registry's whole variable surface with it.
 */
export function resolveSchemaEnvNames(entry: SchemaEntryInput<any, any>) : string[] {
    return entry.env ? [entry.env] : [];
}

/**
 * The value one entry reads from the environment.
 *
 * An unset variable, and a set one whose reader answers undefined (which is
 * how every reader reports a blank value), both leave the key to the passes
 * below it. A key that INHERITS another one's value says so with `resolve`,
 * which runs over merged data and can therefore see what the other key
 * actually resolved to; this pass sees one entry and one variable.
 */
export function readSchemaEntryFromEnv<T, K extends keyof T>(entry: SchemaEntryInput<T, any>) : T[K] | undefined {
    if (!entry.env || !entry.readEnv) {
        return undefined;
    }

    const raw = read(entry.env);
    if (typeof raw !== 'string') {
        return undefined;
    }

    return entry.readEnv(raw, entry.env) as T[K] | undefined;
}
