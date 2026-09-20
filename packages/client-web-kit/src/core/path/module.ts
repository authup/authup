/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PATH_SEPARATOR } from '@authup/core-kit';
import type { ICondition } from '@rapiq/core';
import { eq, or, startsWith } from '@rapiq/core';

/**
 * The condition matching a folder and everything below it, over the
 * server-derived `path` column.
 *
 * The prefix leg carries the separator, so a sibling merely sharing the
 * prefix (`sales2` next to `sales`) is no descendant: the exact leg
 * compares the whole value and the prefix leg can only reach
 * `sales/<segment>`.
 */
export function buildPathScopeCondition(path: string) : ICondition {
    return or(
        eq('path', path),
        startsWith('path', `${path}${PATH_SEPARATOR}`),
    );
}
