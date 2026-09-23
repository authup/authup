/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import { buildQueryString } from '../../helpers';
import type { EntityStatsQuery } from './types';

/**
 * The `@stats` url of an entity collection: the filters travel like a list
 * read's, `granularity` and `days` as plain parameters next to them.
 */
export function buildStatsURL<T extends ObjectLiteral>(
    path: string,
    query: EntityStatsQuery<T> = {},
): string {
    const filters = buildQueryString<T>(query.filters ? { filters: query.filters } : undefined);

    const params = new URLSearchParams();
    if (query.granularity) {
        params.set('granularity', query.granularity);
    }
    if (typeof query.days !== 'undefined') {
        params.set('days', `${query.days}`);
    }

    const search = [filters.replace(/^\?/, ''), params.toString()].filter(Boolean).join('&');

    return `${path}/@stats${search ? `?${search}` : ''}`;
}
