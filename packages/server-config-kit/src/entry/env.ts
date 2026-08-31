/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import type { SchemaEntryInput } from '../types.ts';

/**
 * Every environment variable a key may be read from, in the order they are
 * tried: its own, then the one each `alt` declares. An entry that declares
 * none contributes nothing, so a chain may still yield names through its
 * alternatives.
 */
export function resolveSchemaEnvNames(entry: SchemaEntryInput<any, any>) : string[] {
    const names : string[] = [];

    if (entry.env) {
        names.push(entry.env);
    }

    if (entry.alt) {
        const alts = Array.isArray(entry.alt) ? entry.alt : [entry.alt];
        for (const alt of alts) {
            names.push(...resolveSchemaEnvNames(alt));
        }
    }

    return names;
}

/**
 * The value one entry reads from the environment: its own variable first,
 * then each `alt` in turn.
 *
 * An UNSET variable falls through to the next alternative, which is the
 * ordinary case the chain exists for (`ADMIN_CONSOLE_HOST` unset, the
 * deployment-wide `HOST` set). So does a set variable whose reader answers
 * undefined, which is how every reader reports a blank value.
 *
 * The reader is told which variable the value came from, so its diagnostics
 * name the one an operator actually set.
 */
export function readSchemaEntryFromEnv<T, K extends keyof T>(entry: SchemaEntryInput<T, any>) : T[K] | undefined {
    if (entry.env && entry.readEnv) {
        const raw = read(entry.env);

        if (typeof raw === 'string') {
            const value = entry.readEnv(raw, entry.env);
            if (typeof value !== 'undefined') {
                return value as T[K];
            }
        }
    }

    if (entry.alt) {
        const alts = Array.isArray(entry.alt) ? entry.alt : [entry.alt];
        for (const alt of alts) {
            const value = readSchemaEntryFromEnv(alt);
            if (typeof value !== 'undefined') {
                return value as T[K];
            }
        }
    }

    return undefined;
}
