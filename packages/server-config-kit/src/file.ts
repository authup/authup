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

/**
 * The dotted paths a parsed configuration document holds that no schema entry
 * claims. Reading is deliberately permissive (an unclaimed path is skipped, so
 * a document written for a newer version still boots), which leaves a key at a
 * retired location indistinguishable from one that was never set. This is what
 * a `config validate` command reports so the difference is visible.
 *
 * A path is walked no deeper than the schema does, so an option whose VALUE is
 * an object (a logger setup, middleware options) contributes its own path, not
 * its contents. A key prefixed `x-` is the established extension convention
 * for a document meant to be read by more than one tool, so it is never
 * reported.
 */
export function findUnknownSchemaPaths<T>(
    tree: unknown,
    schema: ConfigSchemaInput<T>,
    options: { prefix?: string } = {},
) : string[] {
    if (!isRecord(tree)) {
        return [];
    }

    const claimed = new Set<string>();
    const traversed = new Set<string>();

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const path = resolveSchemaPath(key as string, schema[key], options.prefix);
        claimed.add(path);

        const segments = path.split('.');
        for (let i = 1; i < segments.length; i++) {
            traversed.add(segments.slice(0, i).join('.'));
        }
    }

    const unknown : string[] = [];

    const walk = (node: Record<string, unknown>, prefix: string) => {
        for (const name of Object.keys(node)) {
            const path = prefix ? `${prefix}.${name}` : name;

            if (claimed.has(path) || name.startsWith('x-')) {
                continue;
            }

            const value = node[name];
            if (traversed.has(path) && isRecord(value)) {
                walk(value, path);
                continue;
            }

            unknown.push(path);
        }
    };

    walk(tree, '');

    return unknown;
}
