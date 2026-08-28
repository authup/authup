/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { z } from 'zod';
import { resolveSchemaEnvNames } from './env.ts';
import { resolveSchemaPath } from './file.ts';
import type { ConfigSchemaEntryInput, ConfigSchemaInput } from './types.ts';
import { isConfigSchemaEntryInput, isConfigSchemaInput } from './check.ts';

const JSON_SCHEMA_DRAFT_7 = 'http://json-schema.org/draft-07/schema#';

function buildProperty<T, K extends keyof T>(entry: ConfigSchemaEntryInput<T, K>) : Record<string, unknown> {
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

    // the key's OWN variable, never the ones a fallback chain borrows: those
    // belong to the keys that declare them, and are documented there.
    const [env] = resolveSchemaEnvNames(entry);
    if (typeof env !== 'undefined') {
        property['x-authup-env'] = env;
    }

    return property;
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
    schema: ConfigSchemaInput<T>,
    options: { title: string, prefix?: string },
) : Record<string, unknown> {
    const properties : Record<string, unknown> = {};

    // A location may hold either an intermediate or a value, never both, and
    // an overwrite would silently drop a key from the published schema.
    const intermediates = new Set<string>();
    const leaves = new Set<string>();

    const keys = Object.keys(schema) as (keyof T)[];
    for (const key of keys) {
        const entry = schema[key];

        if (isConfigSchemaEntryInput(entry)) {
            const path = resolveSchemaPath(key as string, entry, options.prefix);
            const segments = path.split('.');
            const name = segments.pop() as string;

            let container = properties;
            let walked = '';

            for (const segment of segments) {
                walked = walked ? `${walked}.${segment}` : segment;

                if (leaves.has(walked)) {
                    throw new Error(`The config key "${String(key)}" can not be placed at "${path}", because "${walked}" already holds a value.`);
                }

                if (!intermediates.has(walked)) {
                    container[segment] = { type: 'object', properties: {} };
                    intermediates.add(walked);
                }

                container = (container[segment] as { properties: Record<string, unknown> }).properties;
            }

            const leaf = walked ? `${walked}.${name}` : name;
            if (intermediates.has(leaf) || leaves.has(leaf)) {
                throw new Error(`The config key "${String(key)}" can not be placed at "${path}", because the location is already taken.`);
            }

            container[name] = buildProperty(entry);
            leaves.add(leaf);

            continue;
        }

        if (isConfigSchemaInput(entry)) {
            const child = buildSchemaJSONSchema(entry, options);

            properties[key as string] = {
                type: 'object',
                properties: child.properties,
            };
        }
    }

    // No $id or additionalProperties until a consumer needs one.
    return {
        $schema: JSON_SCHEMA_DRAFT_7,
        title: options.title,
        type: 'object',
        properties,
    };
}
