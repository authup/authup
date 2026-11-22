/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isCacheError } from '@rapiq/cache';
import { describeError } from '../../../../utils/index.ts';

/**
 * The log line of a tagged cache failure: `headline`, the tags a failed
 * invalidation concerned, then the error as `describeError` renders it.
 */
export function describeTaggedCacheError(input: unknown, headline: string): string {
    if (isCacheError(input) && input.tags.length > 0) {
        return describeError(input, `${headline} (tags: ${input.tags.join(', ')}).`);
    }

    return describeError(input, `${headline}.`);
}
