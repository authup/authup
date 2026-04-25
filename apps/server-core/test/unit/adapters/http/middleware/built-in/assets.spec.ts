/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { createHandler } from '@routup/assets';
import { registerAssetsMiddleware } from '../../../../../../src/adapters/http/middleware/built-in/assets.ts';
import { PACKAGE_PATH, UI_DIST_PATH } from '../../../../../../src/path.ts';

vi.mock('@routup/assets', () => ({ createHandler: vi.fn(() => ({ __handler: true })) }));

type RouterStub = {
    use: ReturnType<typeof vi.fn>,
};

function createRouterStub(): RouterStub {
    return { use: vi.fn() };
}

describe('registerAssetsMiddleware', () => {
    beforeEach(() => {
        vi.mocked(createHandler).mockClear();
    });

    it('registers a static handler mounted under "public" for server-core public directory', async () => {
        const router = createRouterStub();

        await registerAssetsMiddleware(router as any);

        expect(router.use).toHaveBeenCalled();
        expect(vi.mocked(createHandler)).toHaveBeenCalled();

        const firstCall = vi.mocked(createHandler).mock.calls[0];
        expect(firstCall[0]).toBe(path.posix.join(PACKAGE_PATH, 'public'));
    });

    it('registers a static handler that serves the bundled UI client assets (dist/ui/client)', async () => {
        const router = createRouterStub();

        await registerAssetsMiddleware(router as any);

        const secondCall = vi.mocked(createHandler).mock.calls[1];
        const servedPath = secondCall[0] as string;

        expect(servedPath).toBe(path.posix.join(UI_DIST_PATH, 'client'));

        // Regression guard: the UI served here must come from server-core's own
        // dist/ui subtree (emitted by Vite during the build), not from any
        // sibling-directory lookup. The pre-merge bug was path.join(DIST_PATH, 'client')
        // which collapsed to apps/server-core/dist/client and didn't exist.
        expect(servedPath).toMatch(/server-core[\\/]+dist[\\/]+ui[\\/]+client$/);
        expect(servedPath).not.toMatch(/server-core[\\/]+dist[\\/]+client$/);
        expect(servedPath).not.toMatch(/client-web-slim/);
    });

    it('mounts both static handlers on the "public" route prefix', async () => {
        const router = createRouterStub();

        await registerAssetsMiddleware(router as any);

        const useCalls = router.use.mock.calls;
        expect(useCalls.length).toBeGreaterThanOrEqual(2);
        expect(useCalls[0][0]).toBe('public');
        expect(useCalls[1][0]).toBe('public');
    });
});
