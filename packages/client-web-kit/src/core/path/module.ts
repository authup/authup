/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PATH_SEPARATOR, joinPath, splitPath } from '@authup/core-kit';
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

/**
 * The keys a folder needs expanded to be visible in a tree, itself included
 * so its children show: `sales/berlin/east` yields `sales`, `sales/berlin`
 * and `sales/berlin/east`.
 *
 * A deep link carries the full path and nothing else, so the pane derives
 * the chain from the string rather than from parent ids it has not loaded.
 */
export function buildPathTreeExpansion(path?: string | null) : string[] {
    if (!path) {
        return [];
    }

    const segments = splitPath(path)
        .filter((segment) => segment.length > 0);

    return segments.map((_, index) => joinPath(...segments.slice(0, index + 1)));
}
