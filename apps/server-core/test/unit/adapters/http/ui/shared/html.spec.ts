/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { rebaseAssetURLs } from '../../../../../../src/adapters/http/ui/shared/html.ts';

const HTML = `<!doctype html>
<html lang="en">
<head>
    <link rel="modulepreload" crossorigin href="/public/assets/chunk-abc.js">
    <link rel="stylesheet" crossorigin href="/public/assets/index-def.css">
    <link rel="preload" href="/public/assets/nunito-300-normal.woff2" as="font" type="font/woff2" crossorigin>
    <script type="module" crossorigin src="/public/assets/index-ghi.js"></script>
</head>
<body>
    <div id="app"></div>
    <script>window.__PAYLOAD__ = {"config":{"baseURL":"https://example.com/auth"},"data":{"redirect":"/authorize?response_type=code"}}</script>
</body>
</html>`;

describe('rebaseAssetURLs', () => {
    it('prefixes script, stylesheet and preload references with the base path', () => {
        const result = rebaseAssetURLs(HTML, '/auth', '/public/');

        expect(result).toContain('href="/auth/public/assets/chunk-abc.js"');
        expect(result).toContain('href="/auth/public/assets/index-def.css"');
        expect(result).toContain('href="/auth/public/assets/nunito-300-normal.woff2"');
        expect(result).toContain('src="/auth/public/assets/index-ghi.js"');
        expect(result).not.toContain('"/public/');
    });

    it('does not touch the hydration payload', () => {
        const result = rebaseAssetURLs(HTML, '/auth', '/public/');

        expect(result).toContain('"redirect":"/authorize?response_type=code"');
        expect(result).toContain('"baseURL":"https://example.com/auth"');
    });

    it('returns the input unchanged for an empty base path', () => {
        expect(rebaseAssetURLs(HTML, '', '/public/')).toBe(HTML);
    });

    it('rebases a different fixed vite base (account console)', () => {
        const input = '<script type="module" crossorigin src="/account/assets/index-jkl.js"></script>';

        expect(rebaseAssetURLs(input, '/auth', '/account/'))
            .toBe('<script type="module" crossorigin src="/auth/account/assets/index-jkl.js"></script>');
    });

    it('treats regex metacharacters in the vite base literally', () => {
        const input = '<script src="/public.v2/assets/a.js"></script><script src="/publicXv2/assets/b.js"></script>';

        expect(rebaseAssetURLs(input, '/auth', '/public.v2/'))
            .toBe('<script src="/auth/public.v2/assets/a.js"></script><script src="/publicXv2/assets/b.js"></script>');
    });
});
