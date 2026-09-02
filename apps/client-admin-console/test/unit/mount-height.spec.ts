/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The suite runs under happy-dom, where `import.meta.url` is a browser url
// rather than a file one, so the paths come from vitest's root instead.
const APP_PATH = process.cwd();
const REPOSITORY_PATH = path.join(APP_PATH, '..', '..');

const html = fs.readFileSync(path.join(APP_PATH, 'index.html'), 'utf-8');
const main = fs.readFileSync(path.join(APP_PATH, 'src', 'main.ts'), 'utf-8');
const css = fs.readFileSync(
    path.join(REPOSITORY_PATH, 'packages', 'client-web-theme', 'assets', 'css', 'styles', 'root.css'),
    'utf-8',
);

const mountIds = Array.from(
    new Set(Array.from(main.matchAll(/app\.mount\(\s*'#([\w-]+)'\s*\)/g)).map((match) => match[1])),
);

/**
 * Selectors of every rule that sets a full height, as written.
 */
function fullHeightSelectors() : string[] {
    return css
        .split('}')
        .filter((block) => /height\s*:\s*100%/.test(block))
        .map((block) => block.slice(block.lastIndexOf('*/') + 1).split('{')[0]);
}

/**
 * The console mounts on an element that has to carry html and body's 100%
 * down to the layout. A percentage height resolves against an auto-height
 * parent as auto, so a mount id absent from the theme's height chain
 * collapses the shell to content height and the footer leaves the bottom of
 * the viewport. Nothing throws and no build fails, which is exactly why it
 * is pinned here: the console shipped that way when it moved off nuxt onto
 * `#root` while the chain still listed only the nuxt ids and `#app`.
 */
describe('the mount element', () => {
    it('reads the files it is asserting on', () => {
        // A wrong root would leave every assertion below vacuously true.
        expect(html).toContain('<div id=');
        expect(main).toContain('app.mount(');
        expect(css).toMatch(/height\s*:\s*100%/);
    });

    it('is declared, and is the one index.html provides', () => {
        expect(mountIds.length).toBeGreaterThan(0);

        for (const id of mountIds) {
            expect(html).toContain(`id="${id}"`);
        }
    });

    it('carries the theme full height chain', () => {
        const selectors = fullHeightSelectors();

        for (const id of mountIds) {
            expect(
                selectors.some((selector) => new RegExp(`#${id}\\s*(,|$)`).test(selector.trim())),
                `#${id} is mounted on but sets no full height, so the shell collapses`,
            ).toBe(true);
        }
    });
});
