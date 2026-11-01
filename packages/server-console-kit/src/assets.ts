/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type { Handler } from 'routup';
import { defineCoreHandler } from 'routup';

/**
 * Whether a request path below an asset mount stays inside `directory`
 * once decoded. `@routup/assets` performs no containment check of its
 * own, so this check is the one that confines a lookup to the directory.
 */
export function isAssetRequestPathSafe(requestPath: string, directory: string) : boolean {
    let decoded : string;

    try {
        decoded = decodeURIComponent(requestPath);
    } catch {
        return false;
    }

    if (
        decoded.includes('\\') ||
        decoded.includes('\0') ||
        decoded.split('/').includes('..')
    ) {
        return false;
    }

    const root = path.resolve(directory);
    const target = path.join(root, decoded);
    // a filesystem root already ends in the separator
    const prefix = root.endsWith(path.sep) ? root : root + path.sep;

    return target === root || target.startsWith(prefix);
}

/**
 * Mounted at the same path as, and before, a `@routup/assets` handler.
 * A refused path answers 404 like a missing asset; any other passes on.
 */
export function createAssetPathGuard(directory: string) : Handler {
    return defineCoreHandler((event) => {
        let requestPath = event.path;

        if (requestPath.startsWith(event.mountPath)) {
            requestPath = requestPath.substring(event.mountPath.length);
        }

        if (!isAssetRequestPathSafe(requestPath, directory)) {
            event.response.status = 404;

            return null;
        }

        return event.next();
    });
}
