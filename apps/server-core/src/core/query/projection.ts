/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flattenObject, isObject } from '@authup/kit';
import {
    Field,
    Fields,
    Query,
    isGroupedQuery,
} from '@rapiq/core';
import type { IQuery, Schema } from '@rapiq/core';

/**
 * A column a sparse `fields` projection did not ask for, loaded only so the
 * per-row check of its row sees the whole row. Removed again by
 * {@link trimReachCheckFields} once the check ran.
 */
export class ReachCheckField extends Field {}

/**
 * The columns an unprojected join of the schema loads (its defaults, else
 * every allowed column), or undefined when the schema does not enumerate
 * them.
 */
export function readDefaultFieldNames(schema: Schema<any>): string[] | undefined {
    if (schema.fields.hasDefaults()) {
        return schema.fields.default;
    }

    if (!schema.fields.allowedIsUndefined) {
        return schema.fields.allowed;
    }

    return undefined;
}

function trimPath(value: unknown, segments: string[], column: string): void {
    if (Array.isArray(value)) {
        for (const item of value) {
            trimPath(item, segments, column);
        }

        return;
    }

    if (!isObject(value)) {
        return;
    }

    if (segments.length === 0) {
        Reflect.deleteProperty(value, column);

        return;
    }

    const [head, ...rest] = segments;

    trimPath((value as Record<string, any>)[head!], rest, column);
}

/**
 * Remove every {@link ReachCheckField} column from the rows, so the
 * response carries the projection the request asked for.
 */
export function trimReachCheckFields(rows: Record<string, any>[], query: IQuery): void {
    if (!query.fields) {
        return;
    }

    for (const field of query.fields.value) {
        if (!(field instanceof ReachCheckField)) {
            continue;
        }

        const segments = field.name.split('.');
        const column = segments.pop()!;

        trimPath(rows, segments, column);
    }
}

/**
 * Widen a sparse root projection to the schema's whole default row, so a
 * per-row check evaluates the row rather than the requested part of it: a
 * column the projection left out would read as null there. The added columns
 * are {@link ReachCheckField}s, removed again after the check. A column in
 * `retain` is one the repository loads for every read and the response
 * carries; it is added as a requested column. A grouped query has no rows to
 * check and is returned as is.
 */
export function widenSparseRootProjection(
    query: IQuery,
    schema: Schema<any>,
    retain: string[] = [],
): IQuery {
    if (!query.fields || query.fields.value.length === 0 || isGroupedQuery(query)) {
        return query;
    }

    const requested = new Set<string>();

    for (const field of query.fields.value) {
        if (!field.name.includes('.')) {
            requested.add(field.name);
        }
    }

    const added: Field[] = [];

    for (const name of readDefaultFieldNames(schema) ?? []) {
        if (requested.has(name)) {
            continue;
        }

        added.push(retain.includes(name) ? new Field(name) : new ReachCheckField(name));
    }

    if (added.length === 0) {
        return query;
    }

    return new Query({
        fields: new Fields([...query.fields.value, ...added]),
        filters: query.filters,
        relations: query.relations,
        pagination: query.pagination,
        sorts: query.sorts,
        groups: query.groups,
        aggregates: query.aggregates,
    });
}

/**
 * The attribute names of the row as the response carries it: its flattened
 * keys without the {@link ReachCheckField} columns of the query.
 */
export function readResponseAttributeNames(row: Record<string, any>, query: IQuery): string[] {
    const names = Object.keys(flattenObject(row));

    if (!query.fields) {
        return names;
    }

    const added = query.fields.value
        .filter((field) => field instanceof ReachCheckField)
        .map((field) => field.name);

    if (added.length === 0) {
        return names;
    }

    return names.filter((name) => added.every((item) => !(name === item || name.startsWith(`${item}.`))));
}
