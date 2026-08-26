/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchemaInput } from './types.ts';

/**
 * Where a key lives in the configuration document: its own declared path
 * when it carries one, else the pass prefix plus the key name.
 */
export function resolveSchemaPath(key: string, entry: { path?: string }, prefix?: string) : string {
    return entry.path ?? (prefix ? `${prefix}.${key}` : key);
}

function isRecord(value: unknown) : value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Own properties only, so a `constructor` or `__proto__` segment cannot walk
 * off the document and onto a prototype.
 */
function readTreePath(tree: Record<string, unknown>, path: string) : unknown {
    let node : unknown = tree;

    for (const segment of path.split('.')) {
        if (!isRecord(node) || !Object.hasOwn(node, segment)) {
            return undefined;
        }

        node = node[segment];
    }

    return node;
}

/**
 * The values a parsed configuration document holds for the schema's keys,
 * each read at its resolved path. A key the document says nothing about is
 * absent, so the caller's own defaults stand; a key explicitly set to
 * `false`, `null` or `0` is collected. Values are taken verbatim: coercion
 * and validation happen downstream, against the declared zod types.
 */
export function readSchemaFromFileTree<T>(
    tree: unknown,
    schema: ConfigSchemaInput<T>,
    options: { prefix?: string } = {},
) : Partial<T> {
    if (!isRecord(tree)) {
        return {};
    }

    const data : Record<string, unknown> = {};

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const path = resolveSchemaPath(key as string, schema[key], options.prefix);

        const value = readTreePath(tree, path);
        if (typeof value !== 'undefined') {
            data[key as string] = value;
        }
    }

    return data as Partial<T>;
}
