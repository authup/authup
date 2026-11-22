/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { App } from 'routup';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { IThemeProvider } from '../../src/index.ts';
import { THEME_ASSET_CSP, createThemeAssetsHandler } from '../../src/index.ts';

describe('theme (assets handler)', () => {
    let directory : string;
    let app : App;

    beforeAll(async () => {
        directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-theme-assets-'));
        await fs.promises.writeFile(path.join(directory, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf-8');

        const provider : IThemeProvider = {
            load: async () => {},
            getAssetsPath: async () => directory,
            getManifest: async () => undefined,
            getHead: async () => '',
        };

        app = new App();
        app.use('/theme', createThemeAssetsHandler(provider));
    });

    afterAll(async () => {
        await fs.promises.rm(directory, { recursive: true, force: true });
    });

    it('should pin the content type from the extension map', async () => {
        const response = await app.fetch(new Request('http://localhost/theme/logo.svg'));

        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toEqual('image/svg+xml');
        expect(response.headers.get('x-content-type-options')).toEqual('nosniff');
        expect(response.headers.get('content-security-policy')).toEqual(THEME_ASSET_CSP);
    });

    it('should answer an unsatisfiable range without a content type', async () => {
        const response = await app.fetch(new Request('http://localhost/theme/logo.svg', { headers: { range: 'bytes=9999-' } }));

        expect(response.status).toEqual(416);
        expect(response.headers.get('content-type')).toBeNull();
    });
});
