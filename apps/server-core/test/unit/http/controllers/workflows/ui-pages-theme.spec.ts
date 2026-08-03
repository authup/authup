/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient as createFakeHTTPClient } from '@authup/core-http-kit/testing';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { HTTPInjectionKey } from '../../../../../src/app';
import { createTestApplication } from '../../../../app';
import type { TestHTTPApplication } from '../../../../app';
import { httpRequest } from '../../../../utils';

const MANIFEST = {
    version: 1,
    title: 'Sign in to ACME',
    favicon: 'assets/favicon.svg',
    logo: 'assets/logo.svg',
    stylesheet: 'assets/theme.css',
    tokens: {
        '--authup-periwinkle': '#c0392b',
        '--authup-auth-card-max-width': '520px',
    },
    tokensDark: { '--authup-auth-accent': '#e06c5a' },
};

/**
 * The theme directory is built at runtime rather than committed: the
 * containment test needs a symlink pointing OUT of the mount, which is
 * exactly the shape a Kubernetes ConfigMap volume produces and exactly the
 * shape that must not be servable.
 */
function createThemeDirectory() : { themePath: string, outsidePath: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-theme-'));

    const themePath = path.join(root, 'theme');
    const assetsPath = path.join(themePath, 'assets');
    fs.mkdirSync(assetsPath, { recursive: true });

    fs.writeFileSync(
        path.join(themePath, 'theme.json'),
        JSON.stringify(MANIFEST),
        'utf-8',
    );
    fs.writeFileSync(
        path.join(assetsPath, 'theme.css'),
        ':root{--brand:#c0392b}',
        'utf-8',
    );
    fs.writeFileSync(
        path.join(assetsPath, 'favicon.svg'),
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        'utf-8',
    );
    fs.writeFileSync(
        path.join(assetsPath, 'logo.svg'),
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        'utf-8',
    );

    // A file the operator did not intend to publish, next to the theme.
    const outsidePath = path.join(root, 'secret.css');
    fs.writeFileSync(outsidePath, 'body{content:"leaked"}', 'utf-8');
    fs.symlinkSync(outsidePath, path.join(assetsPath, 'escape.css'));

    return { themePath, outsidePath };
}

describe('http/controllers/workflows/ui-pages-theme', () => {
    const { themePath } = createThemeDirectory();

    const suite : TestHTTPApplication = createTestApplication({
        config: (config) => {
            config.themeDirectoryPath = themePath;
        },
    });

    beforeAll(async () => {
        suite.container.register(HTTPInjectionKey.UIHttpClient, { useFactory: () => createFakeHTTPClient({ handlers: { 'GET /identity-providers': () => ({ data: [], meta: { total: 0 } }) } }) }, { lifetime: 'transient' });

        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    describe('auth console (SSR)', () => {
        it('should inject the token block, favicon and stylesheet', async () => {
            const response = await httpRequest(suite, 'GET', '/register');
            expect(response.status).toEqual(200);

            const body = await response.text();

            expect(body).toContain('<style>@layer authup-theme{');
            expect(body).toContain('--authup-periwinkle:#c0392b');
            expect(body).toContain('.dark{--authup-auth-accent:#e06c5a}');
            expect(body).toContain('<link rel="icon" href="/theme/favicon.svg">');
            expect(body).toContain('<link rel="stylesheet" href="/theme/theme.css">');
        });

        it('should inject before </head>', async () => {
            const response = await httpRequest(suite, 'GET', '/register');
            const body = await response.text();

            expect(body.indexOf('@layer authup-theme'))
                .toBeLessThan(body.indexOf('</head>'));
        });

        it('should link the operator stylesheet AFTER the bundle stylesheet', async () => {
            // The whole precedence model rests on this ordering: the
            // operator sheet is unlayered, so it only wins if it comes last.
            const response = await httpRequest(suite, 'GET', '/register');
            const body = await response.text();

            const bundle = /<link[^>]+rel="stylesheet"[^>]+href="\/public\/[^"]+"/.exec(body);
            expect(bundle, 'the bundle stylesheet link was not found').not.toBeNull();

            expect(body.indexOf(bundle![0]))
                .toBeLessThan(body.indexOf('href="/theme/theme.css"'));
        });

        it('should replace the document title', async () => {
            const response = await httpRequest(suite, 'GET', '/register');
            const body = await response.text();

            expect(body).toContain('<title>Sign in to ACME</title>');
            expect(body).not.toContain('<title>Authup</title>');
        });

        it('should emit the logo tokens the shell CSS consumes', async () => {
            const response = await httpRequest(suite, 'GET', '/register');
            const body = await response.text();

            expect(body).toContain('--authup-auth-logo-image:url("/theme/logo.svg")');
            expect(body).toContain('--authup-auth-logo-mark-visibility:hidden');
        });

        it('should vary by cookie', async () => {
            const response = await httpRequest(suite, 'GET', '/register');

            expect(response.headers.get('vary')).toContain('cookie');
        });
    });

    describe('account console (SPA)', () => {
        it('should inject the same theme', async () => {
            const response = await httpRequest(suite, 'GET', '/account');
            expect(response.status).toEqual(200);

            const body = await response.text();

            expect(body).toContain('<style>@layer authup-theme{');
            expect(body).toContain('<link rel="stylesheet" href="/theme/theme.css">');
            expect(body).toContain('<title>Sign in to ACME</title>');
        });

        it('should emit the account logo tokens', async () => {
            const response = await httpRequest(suite, 'GET', '/account');
            const body = await response.text();

            expect(body).toContain('--authup-account-logo-image:url("/theme/logo.svg")');
            expect(body).toContain('--authup-account-logo-mark-visibility:hidden');
        });

        it('should keep the runtime config marker intact', async () => {
            const response = await httpRequest(suite, 'GET', '/account');
            const body = await response.text();

            expect(body).toContain('window.__AUTHUP__');
        });
    });

    describe('assets', () => {
        it('should serve an allowlisted asset with a pinned content type', async () => {
            const response = await httpRequest(suite, 'GET', '/theme/theme.css');

            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toEqual('text/css; charset=utf-8');
            expect(response.headers.get('x-content-type-options')).toEqual('nosniff');
            expect(await response.text()).toContain('--brand');
        });

        it('should neutralize svg as active content', async () => {
            const response = await httpRequest(suite, 'GET', '/theme/favicon.svg');

            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toEqual('image/svg+xml');
            expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
            expect(response.headers.get('content-security-policy')).toContain('sandbox');
        });

        it('should 304 on a matching etag', async () => {
            const first = await httpRequest(suite, 'GET', '/theme/theme.css');
            const etag = first.headers.get('etag');
            expect(etag).toBeTruthy();

            const second = await httpRequest(suite, 'GET', '/theme/theme.css', { headers: { 'if-none-match': etag as string } });

            expect(second.status).toEqual(304);
        });

        it('should not serve the manifest', async () => {
            // The mount root is <root>/assets, so theme.json is unreachable
            // by construction rather than by an extension filter.
            const response = await httpRequest(suite, 'GET', '/theme/theme.json');

            expect(response.status).toEqual(404);
        });

        it.each([
            '/theme/../theme.json',
            '/theme/%2e%2e/theme.json',
            '/theme/..%2ftheme.json',
            '/theme/a/../../theme.json',
        ])('should reject the traversal %s', async (target) => {
            const response = await httpRequest(suite, 'GET', target);

            expect(response.status).not.toEqual(200);
        });

        it('should refuse a symlink pointing out of the mount', async () => {
            // Following symlinks is mandatory (a ConfigMap volume is a
            // symlink farm), so containment is enforced by realpath, not by
            // refusing links.
            const response = await httpRequest(suite, 'GET', '/theme/escape.css');

            expect(response.status).toEqual(404);
        });

        it('should reject an extension outside the allowlist', async () => {
            fs.writeFileSync(path.join(themePath, 'assets', 'payload.js'), 'alert(1)', 'utf-8');

            const response = await httpRequest(suite, 'GET', '/theme/payload.js');

            expect(response.status).toEqual(404);
        });

        it('should not walk path suffixes', async () => {
            // @routup/assets would serve /theme.css here; the same file must
            // not be reachable at unbounded distinct URLs.
            const response = await httpRequest(suite, 'GET', '/theme/anything/theme.css');

            expect(response.status).toEqual(404);
        });

        it('should not probe for an index document', async () => {
            fs.writeFileSync(
                path.join(themePath, 'assets', 'index.html'),
                '<script>alert(1)</script>',
                'utf-8',
            );

            const nested = await httpRequest(suite, 'GET', '/theme/');
            expect(nested.status).toEqual(404);

            const explicit = await httpRequest(suite, 'GET', '/theme/index.html');
            expect(explicit.status).toEqual(404);
        });
    });
});
