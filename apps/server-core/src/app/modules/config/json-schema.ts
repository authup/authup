/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { z } from 'zod';
import { CONFIG_SCHEMA } from './schema.ts';
import type { Config } from './types.ts';

const JSON_SCHEMA_DRAFT_7 = 'http://json-schema.org/draft-07/schema#';

/**
 * The registry as a JSON Schema (draft-07) document: one property per
 * config key in registry order, carrying the description, the static
 * default and the environment variable name (`x-authup-env`).
 *
 * A function-valued default is process-derived (cwd, NODE_ENV) and not
 * portable, so it is omitted.
 */
export function buildConfigJSONSchema() : Record<string, unknown> {
    const properties : Record<string, Record<string, unknown>> = {};

    const keys = Object.keys(CONFIG_SCHEMA) as (keyof Config)[];
    for (const key of keys) {
        const entry = CONFIG_SCHEMA[key];

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

        properties[key] = property;
    }

    // No $id, additionalProperties or section marker until a consumer needs one.
    return {
        $schema: JSON_SCHEMA_DRAFT_7,
        title: 'Authup configuration',
        type: 'object',
        properties,
    };
}
