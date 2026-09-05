/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'vue-router';
import { createMemoryHistory, createRouter } from 'vue-router';
import { 
    describe, 
    expect, 
    it, 
    vi, 
} from 'vitest';
import { installChunkLoadRecovery } from '../../src/chunk-recovery';

function createChunkLoadError() {
    return new TypeError('Failed to fetch dynamically imported module: http://localhost/assets/users-abc123.js');
}

function createStorage() {
    const data = new Map<string, string>();

    return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
            data.set(key, value);
        },
        removeItem: (key: string) => {
            data.delete(key);
        },
    };
}

function createSuite() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', component: { render: () => null } },
            { path: '/users', component: () => Promise.reject(createChunkLoadError()) },
            { path: '/roles', component: () => Promise.reject(createChunkLoadError()) },
            { path: '/broken', component: () => Promise.reject(new Error('boom')) },
        ],
    });

    const location = {
        href: 'http://localhost/console/admin/roles',
        assign: vi.fn(),
        reload: vi.fn(),
    };
    const storage = createStorage();

    const clear = installChunkLoadRecovery(router, { storage, location });

    return {
        router, 
        location, 
        storage, 
        clear,
    };
}

async function navigate(router: Router, path: string) {
    await router.push(path).catch(() => undefined);
}

function dispatchPreloadError() {
    const event = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(event);

    return event;
}

describe('src/chunk-recovery', () => {
    describe('a navigation whose chunk fails to load', () => {
        it('should load the target in full', async () => {
            const { router, location } = createSuite();

            await navigate(router, '/users');

            expect(location.assign).toHaveBeenCalledTimes(1);
            expect(location.assign).toHaveBeenCalledWith('/users');
        });

        it('should not load the same target again within one document', async () => {
            const { router, location } = createSuite();

            await navigate(router, '/users');
            await navigate(router, '/users');

            expect(location.assign).toHaveBeenCalledTimes(1);
        });

        it('should still load a different target', async () => {
            const { router, location } = createSuite();

            await navigate(router, '/users');
            await navigate(router, '/roles');

            expect(location.assign).toHaveBeenCalledTimes(2);
            expect(location.assign).toHaveBeenLastCalledWith('/roles');
        });

        it('should load the same target again once a mount cleared the marker', async () => {
            const {
                router, 
                location, 
                clear, 
            } = createSuite();

            await navigate(router, '/users');
            clear();
            await navigate(router, '/users');

            expect(location.assign).toHaveBeenCalledTimes(2);
        });

        it('should leave other navigation errors alone', async () => {
            const { router, location } = createSuite();

            await navigate(router, '/broken');

            expect(location.assign).not.toHaveBeenCalled();
        });
    });

    describe('a chunk whose own dependency fails to load', () => {
        it('should prevent the default and reload the document', () => {
            const { location } = createSuite();

            const event = dispatchPreloadError();

            expect(event.defaultPrevented).toBe(true);
            expect(location.reload).toHaveBeenCalledTimes(1);
        });

        it('should not reload the document again within one document', () => {
            const { location } = createSuite();

            dispatchPreloadError();
            const event = dispatchPreloadError();

            expect(event.defaultPrevented).toBe(true);
            expect(location.reload).toHaveBeenCalledTimes(1);
        });

        it('should reload again once a mount cleared the marker', () => {
            const { location, clear } = createSuite();

            dispatchPreloadError();
            clear();
            dispatchPreloadError();

            expect(location.reload).toHaveBeenCalledTimes(2);
        });
    });
});
