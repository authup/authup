/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityType } from '@authup/core-kit';
import type { QuerySchemaShape } from './types.ts';

/**
 * Declares which registered entity schema a route decodes its rapiq
 * query against, and in which of the two read shapes. A build-time
 * marker only: the `DQuerySchema` handler composed into
 * `trapi.config.ts` reads both arguments and stamps the operation with
 * an `x-query-schema` extension, which is what the OpenAPI document's
 * query parameters and its `x-authup-schemas` pointer are derived from.
 *
 * Both arguments are closed vocabularies rather than free strings, so a
 * renamed entity and a forgotten shape are compile errors here instead
 * of a document that advertises a vocabulary no endpoint serves.
 *
 * A runtime no-op, like every other documentation-only decorator the
 * routup preset ships (`DTags`, `DDescription`, `DHidden`). It cannot
 * validate its own arguments: it runs at class-definition time, so a
 * throw there would take the server down over a documentation concern.
 * The types are the guard at the call site, and the trapi handler fails
 * the generate for an argument it cannot resolve.
 */
export function DQuerySchema(
    _schema: `${EntityType}`,
    _shape: QuerySchemaShape,
) : MethodDecorator {
    return () => {};
}
