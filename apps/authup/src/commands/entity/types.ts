/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityType } from '@authup/core-kit';

export type EntityName = `${EntityType}`;

export type EntityQueryArgs = {
    filter?: string,
    sort?: string,
    fields?: string,
    include?: string,
    limit?: string,
    offset?: string,
};

export type EntityStatsArgs = {
    filter?: string,
    group?: string,
    aggregate?: string,
};
