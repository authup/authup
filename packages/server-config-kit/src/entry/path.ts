/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SchemaEntryInput } from '../types.ts';

/**
 * Every location a key may be read from, in the order they are tried: its own
 * (the `path` its section filled in), then the one each `alt` declares. An
 * entry without alternatives is a chain of one.
 */
export function resolveSchemaEntryPaths(
    key: string,
    entry: SchemaEntryInput<any, any>,
) : string[] {
    const paths = [entry.path || key];

    if (entry.alt) {
        const alts = Array.isArray(entry.alt) ? entry.alt : [entry.alt];
        for (const alt of alts) {
            paths.push(...resolveSchemaEntryPaths(key, alt));
        }
    }

    return paths;
}
