/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Parameter, SchemaDescription } from '@rapiq/core';

export type SchemaResponseMeta = {
    /**
     * The version of the deployment that produced these descriptions, so a
     * cached document can be attributed to a release.
     */
    version: string,
    /**
     * A fingerprint of the whole queryable surface. A client that cached
     * descriptions compares this one value to learn whether any of them
     * moved, instead of diffing every document; the same value is stamped
     * into the OpenAPI document as `x-authup-schema-hash`.
     */
    hash: string,
    /**
     * The parameter subset a single-record read decodes. The record shape is
     * advertised here rather than through a second endpoint, because it is
     * one list shared by every entity — a per-schema record description
     * would repeat it 26 times.
     */
    recordParameters: `${Parameter}`[],
};

/**
 * Every registered schema's description, ordered by schema name.
 *
 * Deliberately not the `{ data, meta }` entity envelope: a schema is not an
 * entity, it is the static upper bound of what may be asked of one. The
 * descriptions are byte-identical to the `meta.schema` a matching collection
 * response carries, so either surface can be validated against the other.
 * Actor-dependent gates (the relations read gate, field visibility
 * conditions) silently narrow what a given caller actually receives and are
 * deliberately not reflected here.
 */
export type SchemaCollectionResponse = {
    data: SchemaDescription[],
    meta: SchemaResponseMeta & { total: number },
};

export type SchemaRecordResponse = {
    data: SchemaDescription,
    meta: SchemaResponseMeta,
};

export interface ISchemaAPI {
    getMany() : Promise<SchemaCollectionResponse>;

    /**
     * The name is typed as a plain string rather than as an `EntityType`,
     * because the registry is documented as extensible: a persistence layer
     * may add storage-derived schemas whose names are not entity types. An
     * unregistered name answers 404.
     */
    getOne(name: string) : Promise<SchemaRecordResponse>;
}
