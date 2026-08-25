/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { createHandler } from '@routup/assets';
import { registerAssetsMiddleware } from '../../../../../../src/adapters/http/middleware/built-in/assets.ts';

vi.mock('@routup/assets', () => ({ createHandler: vi.fn(() => ({ __handler: true })) }));

type RouterStub = {
    use: ReturnType<typeof vi.fn>,
};

function createRouterStub(): RouterStub {
    return { use: vi.fn() };
}

function servedPaths() : string[] {
    return vi.mocked(createHandler).mock.calls.map((call) => call[0] as string);
}

function mountsOf(router: RouterStub, mount: string) {
    return router.use.mock.calls.filter((call) => call[0] === mount);
}

/**
 * Every console asset mount lives under the /console prefix (plan 099), all
 * three in the same <segment>/assets shape: the auth console's bundle at
 * console/auth/assets (its pages stay on their protocol routes), the two
 * static consoles at console/admin/assets and console/account/assets. The
 * mount names are spelled out here rather than read off the constants, so
 * a renamed segment fails this spec instead of silently moving the surface.
 */
describe('registerAssetsMiddleware', () => {
    beforeEach(() => {
        vi.mocked(createHandler).mockClear();
    });

    it('serves the auth console client assets (dist/client/assets) under "console/auth/assets"', async () => {
        const router = createRouterStub();

        await registerAssetsMiddleware(router as any);

        // The workspace resolves @authup/client-auth-console (built before
        // server-core via the nx dependency), so the bundle mount must be
        // present. It is skipped only when the dist is missing entirely.
        // The served directory is dist/client/ASSETS, never dist/client: the
        // template and the ssr manifest are render inputs, not files to
        // serve over HTTP.
        const servedPath = servedPaths().find(
            (entry) => /client-auth-console[\\/]+dist[\\/]+client[\\/]+assets$/.test(entry),
        );
        expect(servedPath).toBeDefined();
        expect(servedPaths().some((entry) => /client-auth-console[\\/]+dist[\\/]+client$/.test(entry))).toBe(false);

        // Regression guard: the UI must come from the resolved package, never
        // from a server-core dist subtree (the pre-083 embedded layout).
        expect(servedPath).not.toMatch(/server-core[\\/]+dist/);

        expect(mountsOf(router, 'console/auth/assets')).toHaveLength(1);
    });

    it('mounts nothing else under the retired "public" prefix', async () => {
        // server-core's own `public/` directory (always empty) rode a second
        // mount on the same prefix; both are gone with the move.
        const router = createRouterStub();

        await registerAssetsMiddleware(router as any);

        expect(mountsOf(router, 'public')).toHaveLength(0);
        expect(servedPaths().some((entry) => /server-core[\\/]+public$/.test(entry))).toBe(false);
    });

    it('mounts the account console bundle assets under "console/account/assets"', async () => {
        const router = createRouterStub();

        await registerAssetsMiddleware(router as any);

        // The workspace resolves @authup/client-account-console, so the
        // bundle mount must be present (it is skipped only when the package
        // is missing entirely).
        expect(mountsOf(router, 'console/account/assets')).toHaveLength(1);

        const servedPath = servedPaths().find((entry) => /client-account-console[\\/]+dist[\\/]+assets$/.test(entry));
        expect(servedPath).toBeDefined();
    });

    it('mounts the admin console bundle assets under "console/admin/assets"', async () => {
        const router = createRouterStub();

        await registerAssetsMiddleware(router as any);

        expect(mountsOf(router, 'console/admin/assets')).toHaveLength(1);

        const servedPath = servedPaths().find((entry) => /client-admin-console[\\/]+dist[\\/]+assets$/.test(entry));
        expect(servedPath).toBeDefined();
    });
});
