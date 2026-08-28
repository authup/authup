/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchemaInput } from './types.ts';
import { isConfigSchemaEntryInput, isConfigSchemaInput } from './check.ts';

/**
 * Every location a key may be read from, in the order they are tried: its own
 * declared path (or the pass prefix plus the key name), then the
 * deployment-wide locations it falls back to. A single declared path is a
 * chain of one.
 */
export function resolveSchemaPaths(
    key: string,
    entry: { path?: string | string[] },
    prefix?: string,
) : string[] {
    if (typeof entry.path === 'undefined') {
        return [prefix ? `${prefix}.${key}` : key];
    }

    return Array.isArray(entry.path) ? entry.path : [entry.path];
}

/**
 * Where a key BELONGS in the configuration document: the first location of
 * the chain above. The rest are borrowed from another key, so this is what a
 * published schema and a diagnostic name.
 */
export function resolveSchemaPath(
    key: string,
    entry: { path?: string | string[] },
    prefix?: string,
) : string {
    return resolveSchemaPaths(key, entry, prefix)[0];
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
        const entry = schema[key];

        if (isConfigSchemaEntryInput(entry)) {
            const paths = resolveSchemaPaths(key as string, entry, options.prefix);

            for (const path of paths) {
                const value = readTreePath(tree, path);
                if (typeof value !== 'undefined') {
                    data[key as string] = value;
                    break;
                }
            }
        }

        if (isConfigSchemaInput(entry)) {
            data[key as string] = readSchemaFromFileTree(tree, entry, options);
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


    const unknown : string[] = [];

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];

        if (isConfigSchemaEntryInput(entry)) {
            // every location of a fallback chain, not just the key's own: a
            // document setting the shared one is read, so reporting it as unread
            // would be a lie.
            const paths = resolveSchemaPaths(key as string, schema[key], options.prefix);

            for (const path of paths) {
                claimed.add(path);

                const segments = path.split('.');
                for (let i = 1; i < segments.length; i++) {
                    traversed.add(segments.slice(0, i).join('.'));
                }
            }
        }

        if (isConfigSchemaInput(entry)) {
            unknown.push(...findUnknownSchemaPaths(tree, entry, options));
        }
    }


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
