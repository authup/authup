/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { rebaseAssetURLs, replaceTemplateMarker } from '../../src';

const HTML = `<!doctype html>
<html lang="en">
<head>
    <link rel="modulepreload" crossorigin href="/console/auth/assets/chunk-abc.js">
    <link rel="stylesheet" crossorigin href="/console/auth/assets/index-def.css">
    <link rel="preload" href="/console/auth/assets/nunito-300-normal.woff2" as="font" type="font/woff2" crossorigin>
    <script type="module" crossorigin src="/console/auth/assets/index-ghi.js"></script>
</head>
<body>
    <div id="app"></div>
    <script>window.__PAYLOAD__ = {"config":{"baseURL":"https://example.com/auth"},"data":{"redirect":"/authorize?response_type=code"}}</script>
</body>
</html>`;

describe('replaceTemplateMarker', () => {
    const TEMPLATE = '<body><div id="app"><!--app-html--></div><script src="/console/auth/assets/x.js"></script></body>';

    it.each(['$\'', '$`', '$&', '$$'])('does not expand the %s replacement pattern', (pattern) => {
        const value = `<p>${pattern}</p>`;

        expect(replaceTemplateMarker(TEMPLATE, '<!--app-html-->', value))
            .toBe(`<body><div id="app">${value}</div><script src="/console/auth/assets/x.js"></script></body>`);
    });

    it('replaces only the first occurrence', () => {
        expect(replaceTemplateMarker('<a><!--m--></a><b><!--m--></b>', '<!--m-->', 'x'))
            .toBe('<a>x</a><b><!--m--></b>');
    });

    it('leaves the template untouched when the marker is absent', () => {
        expect(replaceTemplateMarker(TEMPLATE, '<!--missing-->', 'x')).toBe(TEMPLATE);
    });
});

describe('rebaseAssetURLs', () => {
    // The invariant, and it is what makes this a REPLACE: the emitted url
    // must be the public path the caller mounted the bundle's assets under.
    // The vite base is fixed when the bundle is built and says nothing about
    // where the thing serving it is published.
    it('replaces the fixed vite base in every asset reference', () => {
        const result = rebaseAssetURLs(HTML, '/console/auth/', '/auth/console/auth/');

        expect(result).toContain('href="/auth/console/auth/assets/chunk-abc.js"');
        expect(result).toContain('href="/auth/console/auth/assets/index-def.css"');
        expect(result).toContain('href="/auth/console/auth/assets/nunito-300-normal.woff2"');
        expect(result).toContain('src="/auth/console/auth/assets/index-ghi.js"');
        expect(result).not.toContain('"/console/auth/assets/');
    });

    it('does not touch the hydration payload', () => {
        const result = rebaseAssetURLs(HTML, '/console/auth/', '/auth/console/auth/');

        expect(result).toContain('"redirect":"/authorize?response_type=code"');
        expect(result).toContain('"baseURL":"https://example.com/auth"');
    });

    it('rebases a different fixed vite base (account console)', () => {
        const input = '<script type="module" crossorigin src="/console/account/assets/index-jkl.js"></script>';

        expect(rebaseAssetURLs(input, '/console/account/', '/auth/console/account/'))
            .toBe('<script type="module" crossorigin src="/auth/console/account/assets/index-jkl.js"></script>');
    });

    it('does not expand replacement patterns carried by the target', () => {
        // The target derives from publicUrl's pathname, which may legally
        // contain a `$`.
        const input = '<script src="/console/auth/assets/a.js"></script>';

        expect(rebaseAssetURLs(input, '/console/auth/', '/a$&b/'))
            .toBe('<script src="/a$&b/assets/a.js"></script>');
    });

    // The two callers and the four publication shapes each has to survive.
    // A console SERVICE mounts the assets at its own `/assets`, so the whole
    // vite base goes; server-core mounts them AT the vite base under the
    // deployment sub-path, so the base is what it rebuilds.
    it.each([
        ['/console/auth', '/console/auth/assets/'],
        ['/auth/console/auth', '/auth/console/auth/assets/'],
        // published somewhere that does NOT end in the vite base: prefixing
        // would emit /login/console/auth/assets/, which nothing serves once
        // the proxy has stripped /login
        ['/login', '/login/assets/'],
        ['', '/assets/'],
    ])('serves a console published at %s from %s', (basePath, expected) => {
        const input = '<script src="/console/auth/assets/index-abc.js"></script>';

        expect(rebaseAssetURLs(input, '/console/auth/', `${basePath}/`))
            .toBe(`<script src="${expected}index-abc.js"></script>`);
    });
});
