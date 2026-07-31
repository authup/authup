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

/**
 * The SSR UI bundles only the icons it renders (`NuxtIconBundle` in
 * ui/vite.config.ts) instead of registering both full Font Awesome
 * collections (1,902 icons for ~54 used ones).
 *
 * The plugin discovers icon names by SCANNING source, so its glob list is
 * load-bearing and fails silently: a path that stops matching yields an empty
 * icon slot in the browser, not a build error. `ui/src` itself carries no icon
 * names at all, so BOTH sources that matter reach outside this app:
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
        // Resolve the entry through index.html rather than globbing the assets
        // directory: `build:ui` does not clean its output (only the full
        // `build` rimrafs), so a previous build's asset can linger there and
        // would otherwise be asserted against.
        const root = path.join(process.cwd(), 'dist', 'ui', 'client');
        const html = await readFile(path.join(root, 'index.html'), 'utf-8');
        const entry = /(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/.exec(html);

        expect(entry, 'no entry script found in dist/ui/client/index.html').not.toBeNull();

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
