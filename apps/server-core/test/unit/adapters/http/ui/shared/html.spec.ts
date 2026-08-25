/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { rebaseAssetURLs, replaceTemplateMarker } from '../../../../../../src/adapters/http/ui/shared/html.ts';

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
    it('prefixes script, stylesheet and preload references with the base path', () => {
        const result = rebaseAssetURLs(HTML, '/auth', '/console/auth/');

        expect(result).toContain('href="/auth/console/auth/assets/chunk-abc.js"');
        expect(result).toContain('href="/auth/console/auth/assets/index-def.css"');
        expect(result).toContain('href="/auth/console/auth/assets/nunito-300-normal.woff2"');
        expect(result).toContain('src="/auth/console/auth/assets/index-ghi.js"');
        expect(result).not.toContain('"/console/auth/assets/');
    });

    it('does not touch the hydration payload', () => {
        const result = rebaseAssetURLs(HTML, '/auth', '/console/auth/');

        expect(result).toContain('"redirect":"/authorize?response_type=code"');
        expect(result).toContain('"baseURL":"https://example.com/auth"');
    });

    it('returns the input unchanged for an empty base path', () => {
        expect(rebaseAssetURLs(HTML, '', '/console/auth/')).toBe(HTML);
    });

    it('rebases a different fixed vite base (account console)', () => {
        const input = '<script type="module" crossorigin src="/console/account/assets/index-jkl.js"></script>';

        expect(rebaseAssetURLs(input, '/auth', '/console/account/'))
            .toBe('<script type="module" crossorigin src="/auth/console/account/assets/index-jkl.js"></script>');
    });

    it('does not expand replacement patterns carried by the base path', () => {
        // basePath is publicUrl's pathname, which may legally contain a `$`.
        const input = '<script src="/console/auth/assets/a.js"></script>';

        expect(rebaseAssetURLs(input, '/a$&b', '/console/auth/'))
            .toBe('<script src="/a$&b/console/auth/assets/a.js"></script>');
    });

    it('treats regex metacharacters in the vite base literally', () => {
        const input = '<script src="/assets.v2/assets/a.js"></script><script src="/assetsXv2/assets/b.js"></script>';

        expect(rebaseAssetURLs(input, '/auth', '/assets.v2/'))
            .toBe('<script src="/auth/assets.v2/assets/a.js"></script><script src="/assetsXv2/assets/b.js"></script>');
    });
});
