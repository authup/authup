/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SchemaInput } from '../types.ts';
import { isSchemaEntryInput } from '../entry/check.ts';
import { assertSchemaValue, isSchemaInput } from '../schema/check.ts';

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
 * each read at its resolved path. A key the document is silent about is
 * absent, so the caller's own defaults stand; a key explicitly set to
 * `false`, `null` or `0` is collected. Values are taken verbatim: coercion
 * and validation happen downstream, against the declared zod types.
 *
 * A nested schema is read into a nested value, so the result mirrors the
 * config type rather than the document: the entries carry absolute paths, so
 * a section is read out of the same tree its parent was.
 */
export function readSchemaFromFileTree<T>(
    tree: unknown,
    schema: SchemaInput<T>,
) : Partial<T> {
    if (!isRecord(tree)) {
        return {};
    }

    const data : Record<string, unknown> = {};

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];

        if (isSchemaEntryInput(entry)) {
            const value = readTreePath(tree, entry.path || (key as string));
            if (typeof value !== 'undefined') {
                data[key as string] = value;
            }

            continue;
        }

        if (isSchemaInput(entry)) {
            data[key as string] = readSchemaFromFileTree<any>(tree, entry);
            continue;
        }

        assertSchemaValue(key as string);
    }

    return data as Partial<T>;
}

/**
 * Every location the schema reads from, its nested sections included, plus
 * the locations walked through on the way there.
 */
function collectSchemaPaths<T>(
    schema: SchemaInput<T>,
    claimed: Set<string>,
    traversed: Set<string>,
) : void {
    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];

        if (isSchemaEntryInput(entry)) {
            const path = entry.path || (key as string);
            claimed.add(path);

            const segments = path.split('.');
            for (let i = 1; i < segments.length; i++) {
                traversed.add(segments.slice(0, i).join('.'));
            }

            continue;
        }

        if (isSchemaInput(entry)) {
            collectSchemaPaths<any>(entry, claimed, traversed);
            continue;
        }

        assertSchemaValue(key as string);
    }
}

/**
 * The dotted paths a parsed configuration document holds that no schema entry
 * claims. Reading is deliberately permissive (an unclaimed path is skipped, so
 * a document written for a newer version still boots), which leaves a key at a
 * retired location indistinguishable from one that was never set. This is what
 * a `config validate` command reports so the difference is visible.
 *
 * The whole schema is collected before the document is walked, sections
 * included: each entry carries an absolute path, so a section claims
 * locations of the same tree its parent does, and walking once per section
 * would report every other section's keys as unknown.
 *
 * A path is walked no deeper than the schema does, so an option whose VALUE is
 * an object (a logger setup, middleware options) contributes its own path, not
 * its contents. A key prefixed `x-` is the established extension convention
 * for a document meant to be read by more than one tool, so it is never
 * reported.
 */
export function findUnknownSchemaPaths<T>(
    tree: unknown,
    schema: SchemaInput<T>,
) : string[] {
    if (!isRecord(tree)) {
        return [];
    }

    const claimed = new Set<string>();
    const traversed = new Set<string>();

    collectSchemaPaths(schema, claimed, traversed);

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
