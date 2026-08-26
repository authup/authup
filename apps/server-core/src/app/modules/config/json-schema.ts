/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildSchemaJSONSchema } from '@authup/server-config-kit';
import { CONFIG_SECTION } from './constants.ts';
import { CONFIG_SCHEMA } from './registry.ts';

/**
 * The server-core registry as a JSON Schema (draft-07) document, as the
 * build artifact writer (scripts/emit-config-schema.mjs) and the CLI both
 * consume it. Its shape is the shape of `authup.yml`, so an editor's
 * `# yaml-language-server: $schema=...` line validates the nested document.
 */
export function buildConfigJSONSchema() : Record<string, unknown> {
    return buildSchemaJSONSchema(CONFIG_SCHEMA, {
        title: 'Authup configuration',
        prefix: CONFIG_SECTION,
    });
}
