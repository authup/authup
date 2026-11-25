/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import type { RefreshLockManager } from './types.ts';

const REFRESH_LOCK_NAME = `authup:${CookieName.REFRESH_TOKEN}`;

/**
 * How long a refresh waits for the lock before it runs unlocked. A refresh
 * normally holds it for one round-trip; the bound keeps a hung `/token`, or a
 * refresh its holder's own `/token` 401 started, from stalling every tab.
 */
export const REFRESH_LOCK_WAIT_MS = 10_000;

function getLockManager() : RefreshLockManager | undefined {
    if (typeof navigator === 'undefined') {
        return undefined;
    }

    const { locks } = navigator as Navigator & { locks?: RefreshLockManager };

    return locks && typeof locks.request === 'function' ? locks : undefined;
}

/**
 * Run a refresh while holding the origin-wide refresh lock, so two tabs
 * never present the same refresh token (#3925). Without the Web Locks API,
 * or once the wait runs out, the refresh runs unlocked.
 */
export async function runWithRefreshLock<T>(fn: () => Promise<T>) : Promise<T> {
    const locks = getLockManager();

    if (!locks) {
        return fn();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REFRESH_LOCK_WAIT_MS);

    let granted = false;

    try {
        return await locks.request(REFRESH_LOCK_NAME, { signal: controller.signal }, () => {
            granted = true;
            clearTimeout(timeout);

            return fn();
        });
    } catch (e) {
        if (granted) {
            throw e;
        }

        return fn();
    } finally {
        clearTimeout(timeout);
    }
}
