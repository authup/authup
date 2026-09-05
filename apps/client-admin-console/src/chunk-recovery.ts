/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'vue-router';

export const CHUNK_RECOVERY_STORAGE_KEY = 'authup:admin:chunk-recovery';

export type ChunkLoadRecoveryContext = {
    storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
    location?: Pick<Location, 'href' | 'assign' | 'reload'>,
};

function isChunkLoadError(error: unknown) : boolean {
    return error instanceof Error &&
        /dynamically imported module|Importing a module script failed|Unable to preload CSS/.test(error.message);
}

/**
 * Every route is a lazy chunk, so a redeploy (new content hashes, the old
 * files gone) makes the next navigation's import() 404. Without a handler
 * vue-router aborts the navigation silently and the click does nothing; a
 * full load of the target picks up the new shell and its chunks instead.
 *
 * The load is one-shot per target and document: the marker names the url a
 * recovery was issued for and survives the load, so an asset that keeps
 * 404ing is loaded once rather than in a loop the initial navigation would
 * otherwise re-enter with no click in it. The returned function drops the
 * marker; call it once the app mounted, which proves the shell is fresh.
 */
export function installChunkLoadRecovery(router: Router, context: ChunkLoadRecoveryContext = {}) : () => void {
    const storage = context.storage ?? window.sessionStorage;
    const location = context.location ?? window.location;

    const recover = (target: string, load: () => void) => {
        try {
            if (storage.getItem(CHUNK_RECOVERY_STORAGE_KEY) === target) {
                return;
            }

            storage.setItem(CHUNK_RECOVERY_STORAGE_KEY, target);
        } catch {
            // ignore: with no storage to record the attempt, recover as before.
        }

        load();
    };

    router.onError((error, to) => {
        if (!isChunkLoadError(error)) {
            return;
        }

        const { href } = router.resolve(to);
        recover(href, () => location.assign(href));
    });

    // The same failure one level down: a chunk that loaded but whose own
    // dependency (a stylesheet) did not. Vite raises it as an event.
    window.addEventListener('vite:preloadError', (event) => {
        event.preventDefault();
        recover(location.href, () => location.reload());
    });

    return () => {
        try {
            storage.removeItem(CHUNK_RECOVERY_STORAGE_KEY);
        } catch {
            // ignore
        }
    };
}
