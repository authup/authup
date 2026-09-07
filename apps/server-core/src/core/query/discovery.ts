/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SchemaDescription } from '@rapiq/core';
import { describeSchemaRegistry } from './describe.ts';

let descriptions : Record<string, SchemaDescription> | undefined;

/**
 * Memoized like {@link computeSchemaRegistryHash}, and for the same reason:
 * the registry is populated once at module load and every description it
 * holds is itself immutable and memoized, so rebuilding the record per
 * request would only re-sort the same frozen objects.
 */
function resolveDescriptions() : Record<string, SchemaDescription> {
    if (typeof descriptions === 'undefined') {
        descriptions = describeSchemaRegistry();
    }

    return descriptions;
}

/**
 * Every registered schema's description, ordered by schema name — the whole
 * queryable surface of the deployment, which is what `GET /schemas` serves.
 *
 * The descriptions are the SAME objects `meta.schema` carries on a matching
 * collection response and the OpenAPI document projects as
 * `x-authup-schemas`, so the three surfaces cannot disagree.
 */
export function describeQuerySchemas() : SchemaDescription[] {
    return Object.values(resolveDescriptions());
}

/**
 * One registered schema's description, or `undefined` for a name the
 * registry does not hold. Names are entity types today, but the registry is
 * extensible by a persistence layer, so the lookup is by string.
 *
 * The own-property guard is not ceremony: the record is a plain object
 * literal, so an unguarded index would answer `constructor` or `toString`
 * with an inherited member instead of the 404 those names have earned.
 */
export function describeQuerySchemaByName(name: string) : SchemaDescription | undefined {
    const resolved = resolveDescriptions();

    if (!Object.prototype.hasOwnProperty.call(resolved, name)) {
        return undefined;
    }

    return resolved[name];
}
