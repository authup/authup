/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CONFIG_SCHEMA as DOCUMENT_CONFIG_SCHEMA } from '@authup/server-config';
import { buildSchemaJSONSchema } from '@authup/server-config-kit';

/**
 * The WHOLE configuration document as a JSON Schema (draft-07), as the build
 * artifact writer (scripts/emit-config-schema.mjs) and the CLI both consume
 * it. Its shape is the shape of `authup.yml`, so an editor's
 * `# yaml-language-server: $schema=...` line validates the nested document.
 *
 * It describes every key an operator may write, not just the ones this
 * service reads: one document configures the whole deployment, and an
 * operator writing a console service's section must not be told the key does
 * not exist. Every key is declared once in `@authup/server-config`, so the
 * document needs no composition step and no prefix.
 */
export function buildConfigJSONSchema() : Record<string, unknown> {
    return buildSchemaJSONSchema(
        DOCUMENT_CONFIG_SCHEMA,
        { title: 'Authup configuration' },
    );
}
