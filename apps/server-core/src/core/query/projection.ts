/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { Field } from '@rapiq/core';
import type { IQuery, Schema } from '@rapiq/core';

/**
 * A relation column a sparse `fields[relation]` projection did not ask for,
 * loaded only so the per-row reach check of that relation sees the whole
 * row. Removed again by {@link trimReachCheckFields} once the check ran.
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
