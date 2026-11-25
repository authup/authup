/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import type { RefreshLockManager } from './types.ts';

const REFRESH_LOCK_NAME = `authup:${CookieName.REFRESH_TOKEN}`;

function getLockManager() : RefreshLockManager | undefined {
    if (typeof navigator === 'undefined') {
        return undefined;
    }

    const { locks } = navigator as Navigator & { locks?: RefreshLockManager };

    return locks && typeof locks.request === 'function' ? locks : undefined;
}

/**
 * Run a refresh while holding the origin-wide refresh lock, so two tabs
 * never present the same refresh token (#3925). Without the Web Locks API
 * the refresh runs unlocked.
 */
export async function runWithRefreshLock<T>(fn: () => Promise<T>) : Promise<T> {
    const locks = getLockManager();

    if (!locks) {
        return fn();
    }

    return locks.request(REFRESH_LOCK_NAME, fn);
}
