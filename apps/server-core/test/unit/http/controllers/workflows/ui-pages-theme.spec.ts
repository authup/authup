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
 * Built at runtime as a Kubernetes ConfigMap volume actually looks: a
 * symlink farm where every entry points through a `..data` symlink at a
 * timestamped revision directory. Two things depend on it.
 *
 * Containment must survive it: a legitimate asset IS a symlink pointing
 * out of the logical assets directory, so refusing symlinks would break
 * every k8s deployment, while following them blindly would serve anything
 * the farm can reach. `escape.css` below is the symlink that must NOT be
 * served.
 *
 * And a ConfigMap update swaps `..data` to a NEW revision and deletes the
 * old one, so nothing may cache a realpath across requests.
 */
function writeRevision(root: string, revision: string, css: string) : void {
    const dir = path.join(root, revision);
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });

    fs.writeFileSync(path.join(dir, 'theme.json'), JSON.stringify(MANIFEST), 'utf-8');
    fs.writeFileSync(path.join(dir, 'assets', 'theme.css'), css, 'utf-8');
    fs.writeFileSync(
        path.join(dir, 'assets', 'favicon.svg'),
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        'utf-8',
    );
    fs.writeFileSync(
        path.join(dir, 'assets', 'logo.svg'),
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        'utf-8',
    );
}

/** Atomic `..data` swap, exactly what kubelet does on a ConfigMap update. */
function swapRevision(themePath: string, revision: string) : void {
    const link = path.join(themePath, '..data');
    fs.rmSync(link, { force: true });
    fs.symlinkSync(revision, link);
}

function createThemeDirectory() : { themePath: string, outsidePath: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-theme-'));

    const themePath = path.join(root, 'theme');
    fs.mkdirSync(themePath, { recursive: true });

    writeRevision(themePath, '..2026_01_01_00_00_00.000000', ':root{--brand:#c0392b}');
    swapRevision(themePath, '..2026_01_01_00_00_00.000000');

    fs.symlinkSync(path.join('..data', 'theme.json'), path.join(themePath, 'theme.json'));
    fs.symlinkSync(path.join('..data', 'assets'), path.join(themePath, 'assets'));

    // A file the operator did not intend to publish, next to the theme.
    const outsidePath = path.join(root, 'secret.css');
    fs.writeFileSync(outsidePath, 'body{content:"leaked"}', 'utf-8');
    fs.symlinkSync(
        outsidePath,
        path.join(themePath, '..2026_01_01_00_00_00.000000', 'assets', 'escape.css'),
    );

    return { themePath, outsidePath };
}

describe('http/controllers/workflows/ui-pages-theme', () => {
    const { themePath, outsidePath } = createThemeDirectory();

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

    // The auth console pages render in @authup/server-auth-console since
    // plan 101 D2-2, and theme application follows them in D2-3, so the
    // SSR half of this suite lives there. What remains is what server-core
    // still serves and still themes.
    describe('account console (SPA)', () => {
        it('should inject the same theme', async () => {
            const response = await httpRequest(suite, 'GET', '/console/account');
            expect(response.status).toEqual(200);

            const body = await response.text();

            expect(body).toContain('<style>@layer authup-theme{');
            expect(body).toContain('<link rel="stylesheet" href="/theme/theme.css">');
            expect(body).toContain('<title>Sign in to ACME</title>');
        });

        it('should emit the account logo tokens', async () => {
            const response = await httpRequest(suite, 'GET', '/console/account');
            const body = await response.text();

            expect(body).toContain('--authup-account-logo-image:url("/theme/logo.svg")');
            expect(body).toContain('--authup-account-logo-mark-visibility:hidden');
        });

        it('should keep the runtime config marker intact', async () => {
            const response = await httpRequest(suite, 'GET', '/console/account');
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

        it('should keep serving across a ConfigMap revision swap', async () => {
            // kubelet writes a NEW timestamped directory, swaps ..data onto
            // it and deletes the old one. A realpath cached at boot dangles
            // (ENOENT) at that point, which would 404 every asset until the
            // pod restarts.
            const before = await httpRequest(suite, 'GET', '/theme/theme.css');
            expect(before.status).toEqual(200);
            expect(await before.text()).toContain('#c0392b');

            writeRevision(themePath, '..2026_02_02_00_00_00.000000', ':root{--brand:#00ff00}');
            swapRevision(themePath, '..2026_02_02_00_00_00.000000');
            fs.rmSync(path.join(themePath, '..2026_01_01_00_00_00.000000'), {
                recursive: true,
                force: true,
            });

            const after = await httpRequest(suite, 'GET', '/theme/theme.css');
            expect(after.status).toEqual(200);
            expect(await after.text()).toContain('#00ff00');
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
            //
            // The link is (re)created inside the CURRENT revision on purpose.
            // The fixture puts it in the first revision, which the swap test
            // above deletes, so asserting a 404 without this would only prove
            // the file is missing and would pass with the containment check
            // removed.
            const revision = fs.readlinkSync(path.join(themePath, '..data'));
            const assetsPath = path.join(themePath, revision, 'assets');
            const linkPath = path.join(assetsPath, 'escape.css');
            fs.rmSync(linkPath, { force: true });
            fs.symlinkSync(outsidePath, linkPath);

            // Control: the link resolves and its target is readable through
            // the mount, so a 404 can only come from containment. Without it
            // this test cannot tell "refused" from "not there".
            expect(fs.readFileSync(linkPath, 'utf-8')).toContain('leaked');

            const response = await httpRequest(suite, 'GET', '/theme/escape.css');

            expect(response.status).toEqual(404);

            // Control: a legitimate asset in that same directory IS a symlink
            // too and must still be served, so the 404 above is containment
            // and not a blanket refusal to follow links.
            const legitimate = await httpRequest(suite, 'GET', '/theme/theme.css');

            expect(legitimate.status).toEqual(200);
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
