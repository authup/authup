/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isCacheError } from '@rapiq/cache';
import { describeError } from '../../../utils/index.ts';

export const CACHE_ERROR_TAGS_MAX = 10;

/**
 * A column tag carries the row's value (`user:email=...`); only its entity
 * and column reach the log.
 */
function maskCacheTag(tag: string): string {
    const index = tag.indexOf('=');

    return index === -1 ? tag : `${tag.slice(0, index)}=...`;
}

/**
 * Render a cache failure for the LOG: `describeError`, plus the tags a
 * failed or dropped invalidation concerned, at most `CACHE_ERROR_TAGS_MAX`
 * of them, with column values masked.
 */
export function describeCacheError(input: unknown, headline?: string): string {
    const output = describeError(input, headline);

    if (!isCacheError(input) || input.tags.length === 0) {
        return output;
    }

    const { tags } = input;
    let rendered = tags.slice(0, CACHE_ERROR_TAGS_MAX).map(maskCacheTag).join(', ');

    if (tags.length > CACHE_ERROR_TAGS_MAX) {
        rendered += ` (+${tags.length - CACHE_ERROR_TAGS_MAX} more)`;
    }

    const lines = output.split('\n');
    const index = (headline ? 1 : 0) + input.message.split('\n').length;

    lines.splice(index, 0, `  tags:            ${rendered}`);

    return lines.join('\n');
}
