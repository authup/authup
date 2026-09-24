/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityType } from '@authup/core-kit';
import type { ICondition } from '@rapiq/core';
import { contains, inArray, or } from '@rapiq/core';
import { ENTITY_SEARCH_FIELDS, ENTITY_SEARCH_FIELD_DEFAULT } from '../constants';

/**
 * The condition a bare search string becomes when a collection declares no
 * `queryFilters` hook: a substring match against `name` plus every extra
 * field the entity's schema allows (`displayName` today), plus the
 * built-in identifiers whose localized catalog label matched (`names`).
 *
 * A single field stays a plain `contains` rather than a one-armed `or`,
 * which would only add a compound wrapper to the query string.
 */
export function buildEntitySearchCondition(
    type: string,
    value: string,
    names: string[] = [],
) : ICondition {
    const base = contains(ENTITY_SEARCH_FIELD_DEFAULT, value);

    const extra = (ENTITY_SEARCH_FIELDS[type as EntityType] || [])
        .map((field) => contains(field, value));
    if (names.length > 0) {
        extra.push(inArray(ENTITY_SEARCH_FIELD_DEFAULT, names));
    }

    if (extra.length === 0) {
        return base;
    }

    return or(base, ...extra);
}
