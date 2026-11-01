/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { QueryResultCacheOptions } from 'typeorm/cache/QueryResultCacheOptions.js';

export type DatabaseQueryResultCacheOptions = {
    /**
     * Identifiers whose stored value counts only in the generation it was
     * read in.
     */
    fenced?: (identifier: string) => boolean,
};

export type FencedQueryResultCacheOptions = QueryResultCacheOptions & {
    generation?: string,
};
