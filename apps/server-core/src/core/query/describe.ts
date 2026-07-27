/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Parameter } from '@rapiq/core';
import type { Schema, SchemaDescription } from '@rapiq/core';

/**
 * The parameters a single-record read processes — mirrors the
 * `parameters` restriction the services pass to `decodeQuery` for
 * `getOne`, so a record response never advertises filter/sort/
 * pagination vocabulary the endpoint ignores.
 */
export const RECORD_QUERY_PARAMETERS: `${Parameter}`[] = [
    Parameter.FIELDS,
    Parameter.RELATIONS,
];

const cache = new WeakMap<Schema<any>, Map<string, SchemaDescription>>();

/**
 * Serialize an entity schema's declared query constraints for the
 * response `meta.schema` key (issue #1649) — the static upper bound of
 * the queryable vocabulary. Relation capabilities are not expanded
 * inline: `relations.schemas` names each relation's target schema,
 * whose own endpoints carry its description. Actor-dependent gates
 * (relations read gate, field visibility conditions) are deliberately
 * not reflected. Descriptions are immutable per (schema, parameters),
 * so they are memoized — callers MUST NOT mutate the returned object.
 */
export function describeQuerySchema(
    schema: Schema<any>,
    parameters?: `${Parameter}`[],
) : SchemaDescription {
    let bySignature = cache.get(schema);
    if (!bySignature) {
        bySignature = new Map();
        cache.set(schema, bySignature);
    }

    const signature = parameters ? [...parameters].sort().join(',') : '*';

    let output = bySignature.get(signature);
    if (!output) {
        output = schema.describe(parameters ? { parameters } : {});
        bySignature.set(signature, output);
    }

    return output;
}
