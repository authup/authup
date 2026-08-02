/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { resolveAuthConsoleDistPath } from '../../../../../src/adapters/http/ui/auth-console/resolve.ts';

/**
 * The SSR UI bundles only the icons it renders (`NuxtIconBundle` in
 * apps/client-auth-console/vite.config.ts) instead of registering both full
 * Font Awesome collections (1,902 icons for ~54 used ones).
 *
 * The plugin discovers icon names by SCANNING source, so its glob list is
 * load-bearing and fails silently: a path that stops matching yields an empty
 * icon slot in the browser, not a build error. The app's own src carries no
 * icon names at all, so BOTH sources that matter reach outside it:
 *
 *  - `packages/client-web-kit/src`, whose components and identity-provider
 *    preset tables hold the icons these pages render,
 *  - `@vuecs/icons-font-awesome`, whose preset supplies the vuecs behavioral
 *    defaults (pagination arrows, submit-button, alert, collapse chevrons).
 *    Those names appear in no authup source file.
 *
 * Each is pinned below by an icon that can only come from it.
 *
 * Asserted against the built client bundle rather than a rendered page on
 * purpose: `@iconify/vue` resolves icons on the client, so a server-rendered
 * page carries empty `<svg>` shells whether or not the icon data was bundled
 * (verified against the pre-bundling build, which renders identically).
 */
describe('http/controllers/workflows/ui-pages-icons', () => {
    let bundle: string;

    beforeAll(async () => {
        // The bundle ships as @authup/client-auth-console (built before
        // server-core via the nx dependency); resolve it like the serving
        // seam does. The entry is resolved through index.html rather than by
        // globbing the assets directory, so a lingering asset from an older
        // build can never be asserted against.
        const distPath = resolveAuthConsoleDistPath();
        expect(distPath, 'auth console bundle not built (npm run build -w apps/client-auth-console)').toBeDefined();

        const root = path.join(distPath!, 'client');
        const html = await readFile(path.join(root, 'index.html'), 'utf-8');
        const entry = /(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/.exec(html);

        expect(entry, 'no entry script found in dist/client/index.html').not.toBeNull();

        bundle = await readFile(path.join(root, entry![1]), 'utf-8');
    });

    it('should bundle an icon only the kit references', () => {
        // fa6-brands:github, from the kit's identity-provider preset table.
        expect(bundle).toContain('github');
    });

    it('should bundle an icon only the vuecs preset references', () => {
        // fa6-solid:angles-left, the pagination "first page" default.
        expect(bundle).toContain('angles-left');
    });

    it('should not bundle the full font-awesome collections', () => {
        // Two icons no authup source references. Their presence means the
        // subset degraded back into a full-collection registration.
        expect(bundle).not.toContain('chess-knight');
        expect(bundle).not.toContain('bacterium');
    });
});
