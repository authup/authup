/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { z } from 'zod';
import type { SchemaEntryInput, SchemaInput } from '../types.ts';
import { isSchemaEntryInput } from '../entry/check.ts';
import { assertSchemaValue, isSchemaInput } from '../schema/check.ts';

const JSON_SCHEMA_DRAFT_7 = 'http://json-schema.org/draft-07/schema#';

function buildProperty<T, K extends keyof T>(entry: SchemaEntryInput<T, K>) : Record<string, unknown> {
    let property : Record<string, unknown>;
    try {
        property = z.toJSONSchema(entry.type, { target: 'draft-7', unrepresentable: 'any' });
    } catch {
        property = {};
    }

    delete property.$schema;

    property.description = entry.description;

    const value : unknown = entry.default;
    if (typeof value !== 'undefined' && typeof value !== 'function') {
        property.default = value;
    }

    if (typeof entry.env !== 'undefined') {
        property['x-authup-env'] = entry.env;
    }

    return property;
}

/**
 * Every entry the schema holds, its nested sections included, each paired
 * with the key it is declared under.
 *
 * The document is described by PATH, and every entry carries an absolute one,
 * so a section contributes to the same tree its parent does. Building a
 * section into a property of its own instead would place `server.core.port`
 * under a second `core` property and describe a file nobody writes.
 */
function collectSchemaEntries<T>(
    schema: SchemaInput<T>,
    entries: [string, SchemaEntryInput<any, any>][] = [],
) : [string, SchemaEntryInput<any, any>][] {
    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];

        if (isSchemaEntryInput(entry)) {
            entries.push([key as string, entry]);
            continue;
        }

        if (isSchemaInput(entry)) {
            collectSchemaEntries<any>(entry, entries);
            continue;
        }

        assertSchemaValue(key as string);
    }

    return entries;
}

/**
 * A registry as a JSON Schema (draft-07) document, shaped like the
 * configuration file itself: each key's property sits at its resolved path,
 * with plain object intermediates in between, so a `$schema` line validates
 * a nested document. A property carries the description, the static default
 * and the environment variable name (`x-authup-env`).
 *
 * A function-valued default is process-derived (cwd, NODE_ENV) and not
 * portable, so it is omitted.
 */
export function buildSchemaJSONSchema<T>(
    schema: SchemaInput<T>,
    options: { title: string },
) : Record<string, unknown> {
    const properties : Record<string, unknown> = {};

    // A location may hold either an intermediate or a value, never both, and
    // an overwrite would silently drop a key from the published schema. The
    // sets span every section, so two keys claiming one location fail here
    // rather than in an operator's editor.
    const intermediates = new Set<string>();
    const leaves = new Set<string>();

    const entries = collectSchemaEntries(schema);
    for (const [key, entry] of entries) {
        const path = entry.path || key;
        const segments = path.split('.');
        const name = segments.pop() as string;

        let container = properties;
        let walked = '';

        for (const segment of segments) {
            walked = walked ? `${walked}.${segment}` : segment;

            if (leaves.has(walked)) {
                throw new Error(`The config key "${key}" can not be placed at "${path}", because "${walked}" already holds a value.`);
            }

            if (!intermediates.has(walked)) {
                container[segment] = { type: 'object', properties: {} };
                intermediates.add(walked);
            }

            container = (container[segment] as { properties: Record<string, unknown> }).properties;
        }

        const leaf = walked ? `${walked}.${name}` : name;
        if (intermediates.has(leaf) || leaves.has(leaf)) {
            throw new Error(`The config key "${key}" can not be placed at "${path}", because the location is already taken.`);
        }

        container[name] = buildProperty(entry);
        leaves.add(leaf);
    }

    // No $id or additionalProperties until a consumer needs one.
    return {
        $schema: JSON_SCHEMA_DRAFT_7,
        title: options.title,
        type: 'object',
        properties,
    };
}
