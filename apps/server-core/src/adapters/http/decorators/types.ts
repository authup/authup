/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Which of the two read shapes a route serves, and with it which
 * parameter subset it decodes: a collection read decodes the schema's
 * full vocabulary, a record read only `RECORD_QUERY_PARAMETERS`, and a
 * `filters` read only the filter tree, which is the bulk-revoke shape
 * (`DELETE /sessions`, `DELETE /session-tokens`) where the filter is what
 * discriminates a self-service call from an administrative one.
 *
 * The shape is named rather than the parameter list spelled out,
 * because `@trapi/metadata` cannot fold an IMPORTED constant into a
 * decorator argument (only literals, enum members and own-file
 * declarations), so passing `RECORD_QUERY_PARAMETERS` itself resolves
 * to nothing. Naming the shape keeps that list declared exactly once:
 * `trapi.config.ts` imports it and maps this value onto it.
 */
export type QuerySchemaShape = 'collection' | 'record' | 'filters';
