/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchemaInput } from '@authup/server-config-kit';
import { buildSchemaJSONSchema, composeSchemas } from '@authup/server-config-kit';
import { CONFIG_SECTION } from './constants.ts';
import { CONFIG_SCHEMA } from './registry.ts';

/**
 * The configuration registry as a JSON Schema (draft-07) document, as the
 * build artifact writer (scripts/emit-config-schema.mjs) and the CLI both
 * consume it. Its shape is the shape of `authup.yml`, so an editor's
 * `# yaml-language-server: $schema=...` line validates the nested document.
 *
 * `schemas` are the registries of the other packages the same document
 * configures. The build artifact carries server-core's alone, since that is
 * the package it ships with; the CLI passes the console services' too, so
 * `authup config schema` describes the whole document an operator writes.
 */
export function buildConfigJSONSchema(
    schemas: { prefix?: string, schema: ConfigSchemaInput<any> }[] = [],
) : Record<string, unknown> {
    return buildSchemaJSONSchema(
        composeSchemas([
            { prefix: CONFIG_SECTION, schema: CONFIG_SCHEMA },
            ...schemas,
        ]),
        { title: 'Authup configuration' },
    );
}
