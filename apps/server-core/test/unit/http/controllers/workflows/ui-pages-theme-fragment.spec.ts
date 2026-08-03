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

const FRAGMENT = '<meta name="operator" content="acme"><link rel="preconnect" href="https://cdn.example.com">';

/**
 * Own suite because the fragment flag is application-level config, and the
 * point of the test is the config -> provider -> rendered page threading.
 * ui-pages-theme.spec.ts covers the same directory with the flag OFF.
 */
function createThemeDirectory() : string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-theme-fragment-'));

    fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(root, 'fragments'), { recursive: true });

    fs.writeFileSync(
        path.join(root, 'theme.json'),
        JSON.stringify({
            version: 1,
            stylesheet: 'assets/theme.css',
            tokens: { '--authup-auth-accent': '#c0392b' },
        }),
        'utf-8',
    );
    fs.writeFileSync(path.join(root, 'assets', 'theme.css'), 'body{}', 'utf-8');
    fs.writeFileSync(path.join(root, 'fragments', 'head.html'), FRAGMENT, 'utf-8');

    return root;
}

describe('http/controllers/workflows/ui-pages-theme-fragment', () => {
    const themePath = createThemeDirectory();

    const suite : TestHTTPApplication = createTestApplication({
        config: (config) => {
            config.themeDirectoryPath = themePath;
            config.themeFragmentsEnabled = true;
        },
    });

    beforeAll(async () => {
        suite.container.register(HTTPInjectionKey.UIHttpClient, { useFactory: () => createFakeHTTPClient({ handlers: { 'GET /identity-providers': () => ({ data: [], meta: { total: 0 } }) } }) }, { lifetime: 'transient' });

        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should splice the fragment into the auth console head', async () => {
        const response = await httpRequest(suite, 'GET', '/register');
        expect(response.status).toEqual(200);

        const body = await response.text();

        expect(body).toContain('<meta name="operator" content="acme">');
        expect(body.indexOf('<meta name="operator"'))
            .toBeLessThan(body.indexOf('</head>'));
    });

    it('should splice the fragment into the account console head', async () => {
        const response = await httpRequest(suite, 'GET', '/account');
        expect(response.status).toEqual(200);

        expect(await response.text()).toContain('<meta name="operator" content="acme">');
    });

    it('should place the fragment after the theme stylesheet', async () => {
        // So an operator can override anything the manifest emitted.
        const response = await httpRequest(suite, 'GET', '/register');
        const body = await response.text();

        expect(body.indexOf('href="/theme/theme.css"'))
            .toBeLessThan(body.indexOf('<meta name="operator"'));
    });

    it('should not serve the fragment as an asset', async () => {
        // fragments/ sits outside assets/, the only HTTP-reachable subtree.
        const response = await httpRequest(suite, 'GET', '/theme/../fragments/head.html');

        expect(response.status).not.toEqual(200);
    });
});
