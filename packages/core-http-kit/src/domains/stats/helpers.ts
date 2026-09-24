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
 * The `@stats` url of an entity collection. Filters, groups and aggregates
 * travel through the same codec as a list read.
 */
export function buildStatsURL<T extends ObjectLiteral>(
    path: string,
    query: EntityStatsQuery<T> = {},
): string {
    return `${path}/@stats${buildQueryString<T>(query)}`;
}
