/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    applyTheme,
    buildThemeHead,
    parseThemeManifest,
} from '../../../../../src/adapters/http/ui/theme/index.ts';
import type { IThemeProvider, ThemeManifest } from '../../../../../src/adapters/http/ui/theme/index.ts';
import {
    injectHeadContent,
    stampDocumentTitle,
} from '../../../../../src/adapters/http/ui/shared/index.ts';

function createProvider(manifest: ThemeManifest | undefined) : IThemeProvider {
    return {
        load: async () => { /* noop */ },
        getManifest: async () => manifest,
        getAssetsPath: () => undefined,
        getHead: async (basePath: string) => (manifest ? buildThemeHead(manifest, basePath) : ''),
    };
}

describe('adapters/http/ui/theme', () => {
    describe('parseThemeManifest', () => {
        it('should accept a minimal manifest', async () => {
            const manifest = await parseThemeManifest({ version: 1 }, 'theme.json');

            expect(manifest.version).toEqual(1);
        });

        it('should reject an unknown contract version', async () => {
            await expect(parseThemeManifest({ version: 2 }, 'theme.json')).rejects.toThrow();
        });

        it('should reject an unknown key', async () => {
            // .strict() — a typo must fail the boot, not silently do nothing.
            await expect(parseThemeManifest(
                { version: 1, stylesheets: 'assets/theme.css' },
                'theme.json',
            )).rejects.toThrow();
        });

        it('should name the file and the offending path', async () => {
            await expect(parseThemeManifest(
                { version: 1, tokens: { '--ok': 'red', 'not-a-token': 'red' } },
                '/etc/authup/theme/theme.json',
            )).rejects.toThrow(/\/etc\/authup\/theme\/theme\.json/);
        });

        it.each([
            ['--Authup-Accent', 'uppercase'],
            ['authup-accent', 'no leading dashes'],
            ['--1accent', 'leading digit'],
            ['--authup accent', 'whitespace'],
        ])('should reject the token name %s (%s)', async (name) => {
            await expect(parseThemeManifest(
                { version: 1, tokens: { [name]: 'red' } },
                'theme.json',
            )).rejects.toThrow();
        });

        it.each([
            ['red}html{display:none', 'closes the declaration block'],
            ['red;color:blue', 'injects a second declaration'],
            ['</style><script>x()</script>', 'breaks out of the style element'],
            ['url(https://evil.example.com/x)', 'turns the block into a request sink'],
            ['expression(alert(1))', 'legacy dynamic expression'],
            ['red/*comment', 'opens a comment'],
            ['@import "x"', 'starts an at-rule'],
        ])('should reject the token value %s (%s)', async (value) => {
            await expect(parseThemeManifest(
                { version: 1, tokens: { '--authup-auth-accent': value } },
                'theme.json',
            )).rejects.toThrow();
        });

        it('should accept realistic token values', async () => {
            const manifest = await parseThemeManifest({
                version: 1,
                tokens: {
                    '--authup-periwinkle': '#c0392b',
                    '--authup-auth-card-max-width': '520px',
                    '--font-sans': 'Inter, system-ui, sans-serif',
                    '--authup-auth-card-box-shadow': '0 1px 2px rgba(0,0,0,.1)',
                    '--radius-md': '2px',
                    '--text-6xl': '3.75rem',
                },
            }, 'theme.json');

            expect(Object.keys(manifest.tokens ?? {})).toHaveLength(6);
        });

        it.each([
            ['/etc/passwd', 'absolute'],
            ['../../etc/passwd', 'escapes the theme root'],
            ['assets/../../etc/passwd', 'traverses out of assets'],
            ['assets/a/../../../etc/passwd', 'traverses via a nested segment'],
            ['theme.css', 'outside the assets directory'],
            ['assets/index.html', 'not an allowlisted extension'],
            ['assets/payload.js', 'not an allowlisted extension'],
        ])('should reject the asset path %s (%s)', async (value) => {
            await expect(parseThemeManifest(
                { version: 1, stylesheet: value },
                'theme.json',
            )).rejects.toThrow();
        });

        it('should accept an asset path inside assets/', async () => {
            const manifest = await parseThemeManifest({
                version: 1,
                stylesheet: 'assets/theme.css',
                favicon: 'assets/brand/favicon.svg',
            }, 'theme.json');

            expect(manifest.stylesheet).toEqual('assets/theme.css');
            expect(manifest.favicon).toEqual('assets/brand/favicon.svg');
        });
    });

    describe('buildThemeHead', () => {
        it('should emit the token block into its own cascade layer', async () => {
            const head = buildThemeHead({
                version: 1,
                tokens: { '--authup-auth-accent': '#c0392b' },
            }, '');

            expect(head).toEqual(
                '<style>@layer authup-theme{:root{--authup-auth-accent:#c0392b}}</style>',
            );
        });

        it('should emit .dark AFTER :root so the color-mode toggle keeps working', async () => {
            const head = buildThemeHead({
                version: 1,
                tokens: { '--authup-surface-app': '#fff' },
                tokensDark: { '--authup-surface-app': '#141312' },
            }, '');

            expect(head.indexOf(':root'))
                .toBeLessThan(head.indexOf('.dark'));
            expect(head).toContain(':root{--authup-surface-app:#fff}');
            expect(head).toContain('.dark{--authup-surface-app:#141312}');
        });

        it('should emit the stylesheet link last so it beats the token block', async () => {
            const head = buildThemeHead({
                version: 1,
                tokens: { '--authup-auth-accent': 'red' },
                favicon: 'assets/favicon.svg',
                stylesheet: 'assets/theme.css',
            }, '');

            expect(head.indexOf('<style>'))
                .toBeLessThan(head.indexOf('rel="stylesheet"'));
            expect(head.indexOf('rel="icon"'))
                .toBeLessThan(head.indexOf('rel="stylesheet"'));
        });

        it('should map an asset path onto the /theme mount', async () => {
            const head = buildThemeHead({
                version: 1,
                stylesheet: 'assets/theme.css',
            }, '');

            expect(head).toContain('href="/theme/theme.css"');
        });

        it('should prefix asset hrefs with the sub-path base', async () => {
            // rebaseAssetURLs only rewrites the fixed /public/ and /account/
            // vite bases, so /theme hrefs must be built prefixed.
            const head = buildThemeHead({
                version: 1,
                favicon: 'assets/favicon.svg',
                stylesheet: 'assets/theme.css',
            }, '/auth');

            expect(head).toContain('href="/auth/theme/favicon.svg"');
            expect(head).toContain('href="/auth/theme/theme.css"');
        });

        it('should emit nothing for an empty manifest', async () => {
            expect(buildThemeHead({ version: 1 }, '')).toEqual('');
            expect(buildThemeHead({ version: 1, tokens: {} }, '')).toEqual('');
        });
    });

    describe('buildThemeHead (logo)', () => {
        it('should emit the logo token pair for both consoles', async () => {
            const head = buildThemeHead({ version: 1, logo: 'assets/logo.svg' }, '');

            expect(head).toContain('--authup-auth-logo-image:url("/theme/logo.svg")');
            expect(head).toContain('--authup-auth-logo-mark-visibility:hidden');
            expect(head).toContain('--authup-account-logo-image:url("/theme/logo.svg")');
            expect(head).toContain('--authup-account-logo-mark-visibility:hidden');
        });

        it('should prefix the logo url with the sub-path base', async () => {
            const head = buildThemeHead({ version: 1, logo: 'assets/logo.png' }, '/auth');

            expect(head).toContain('url("/auth/theme/logo.png")');
        });

        it('should let an explicit token override the derived one', async () => {
            const head = buildThemeHead({
                version: 1,
                logo: 'assets/logo.svg',
                tokens: { '--authup-account-logo-mark-visibility': 'visible' },
            }, '');

            expect(head).toContain('--authup-account-logo-mark-visibility:visible');
            expect(head).not.toContain('--authup-account-logo-mark-visibility:hidden');
        });

        it('should emit no logo tokens without a logo', async () => {
            const head = buildThemeHead({ version: 1, tokens: { '--a': 'b' } }, '');

            expect(head).not.toContain('logo-image');
        });

        it.each([
            'assets/theme.css',
            'assets/inter.woff2',
        ])('should reject the non-image logo %s', async (value) => {
            await expect(parseThemeManifest({ version: 1, logo: value }, 'theme.json'))
                .rejects.toThrow();
        });

        it.each([
            'assets/logo.svg',
            'assets/logo.png',
            'assets/brand/logo.webp',
        ])('should accept the image logo %s', async (value) => {
            expect((await parseThemeManifest({ version: 1, logo: value }, 'theme.json')).logo)
                .toEqual(value);
        });
    });

    describe('buildThemeHead (head fragment)', () => {
        it('should append the fragment after everything the manifest emitted', async () => {
            const head = buildThemeHead({
                version: 1,
                tokens: { '--authup-auth-accent': 'red' },
                stylesheet: 'assets/theme.css',
            }, '', '<meta name="x" content="y">');

            expect(head.indexOf('rel="stylesheet"'))
                .toBeLessThan(head.indexOf('<meta name="x"'));
        });

        it('should pass the fragment through verbatim', async () => {
            // Operator-authored markup. A partial sanitizer would be worse
            // than none, because it invites treating fragments as
            // untrusted-safe.
            const fragment = '<script>window.x=1</script>';
            const head = buildThemeHead({ version: 1 }, '', fragment);

            expect(head).toEqual(fragment);
        });

        it('should emit only the fragment when the manifest is empty', async () => {
            expect(buildThemeHead({ version: 1 }, '', '<meta name="a">'))
                .toEqual('<meta name="a">');
        });
    });

    describe('applyTheme', () => {
        const html = '<html><head><title>Authup</title></head><body>x</body></html>';

        it('should be a no-op without a provider', async () => {
            await expect(applyTheme(html, undefined, '')).resolves.toEqual(html);
        });

        it('should be a no-op without a manifest', async () => {
            await expect(applyTheme(html, createProvider(undefined), '')).resolves.toEqual(html);
        });

        it('should inject before </head>', async () => {
            const result = await applyTheme(html, createProvider({
                version: 1,
                tokens: { '--authup-auth-accent': 'red' },
            }), '');

            expect(result).toContain('<style>@layer authup-theme{');
            expect(result.indexOf('@layer authup-theme'))
                .toBeLessThan(result.indexOf('</head>'));
        });

        it('should replace the document title', async () => {
            const result = await applyTheme(html, createProvider({
                version: 1,
                title: 'Sign in to ACME',
            }), '');

            expect(result).toContain('<title>Sign in to ACME</title>');
            expect(result).not.toContain('<title>Authup</title>');
        });

        it('should escape the title', async () => {
            const result = await applyTheme(html, createProvider({
                version: 1,
                title: '</title><script>alert(1)</script>',
            }), '');

            expect(result).not.toContain('<script>alert(1)</script>');
            expect(result).toContain('&lt;script&gt;');
        });
    });

    describe('injectHeadContent', () => {
        it('should return the html unchanged when there is no head', async () => {
            expect(injectHeadContent('<p>x</p>', '<style>a{}</style>')).toEqual('<p>x</p>');
        });

        it('should not expand replacement patterns', async () => {
            // A string replacement would expand $' into the template tail.
            const result = injectHeadContent('<head></head>', "<meta content=\"$'$&$`\">");

            expect(result).toEqual("<head><meta content=\"$'$&$`\"></head>");
        });
    });

    describe('stampDocumentTitle', () => {
        it('should replace a title carrying attributes', async () => {
            expect(stampDocumentTitle('<title data-x="1">Authup - Account</title>', 'ACME'))
                .toEqual('<title>ACME</title>');
        });

        it('should not expand replacement patterns', async () => {
            expect(stampDocumentTitle('<title>Authup</title>', "A$'B"))
                .toEqual("<title>A$'B</title>");
        });
    });
});
