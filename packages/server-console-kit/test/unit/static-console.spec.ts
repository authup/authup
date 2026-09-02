/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { basic } from '@routup/basic';
import { App, defineCoreHandler } from 'routup';
import type { IAppEvent } from 'routup';
import { serve } from 'routup/node';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import { defineStaticConsole } from '../../src';

const SHELL = '<!doctype html><html><head></head><body><div id="app"></div><!--test-config--></body></html>';

const OPTIONS = {
    basePath: '/console/test',
    assetBasePath: '/console/test/',
    config: { apiUrl: 'https://example.com' },
};

let server : ReturnType<typeof serve> | undefined;

afterEach(async () => {
    await server?.close(true);
    server = undefined;
});

async function captureEvent() : Promise<IAppEvent> {
    let captured : IAppEvent | undefined;

    const app = new App();
    app.use(basic({ cookie: true, query: true }));
    app.use(defineCoreHandler({
        method: 'get',
        path: '',
        fn: (event) => {
            captured = event;

            return 'ok';
        },
    }));

    const local = serve(app, { port: 0, silent: true });
    await local.ready();

    try {
        await fetch(`${(local.url ?? '').replace(/\/+$/, '')}/`);
    } finally {
        await local.close(true);
    }

    if (!captured) {
        throw new Error('no event captured');
    }

    return captured;
}

describe('defineStaticConsole', () => {
    it('takes the shell from readShell instead of the dist', async () => {
        const staticConsole = defineStaticConsole({
            packageName: '@authup/does-not-exist',
            marker: '<!--test-config-->',
            viteBase: '/console/test/',
            cwd: process.cwd(),
            readShell: async () => SHELL,
        });

        const app = new App();
        app.use(basic({ cookie: true, query: true }));
        app.use(defineCoreHandler({
            method: 'get',
            path: '',
            fn: (event) => staticConsole.serve(event, OPTIONS),
        }));

        server = serve(app, { port: 0, silent: true });
        await server.ready();

        const baseURL = (server.url ?? '').replace(/\/+$/, '');
        const response = await fetch(`${baseURL}/`);
        const body = await response.text();

        expect(response.status).toEqual(200);
        expect(body).toContain('window.__AUTHUP__');
        expect(body).toContain('https://example.com');
        expect(body).not.toContain('<!--test-config-->');
    });

    it('still reports the missing bundle when no readShell is supplied', async () => {
        const staticConsole = defineStaticConsole({
            packageName: '@authup/does-not-exist',
            marker: '<!--test-config-->',
            viteBase: '/console/test/',
            cwd: process.cwd(),
        });

        // The shell read is the first thing `serve` does, so the event is
        // never touched and no server is needed to reach this branch.
        await expect(staticConsole.serve(await captureEvent(), OPTIONS))
            .rejects.toThrow(/not built or installed/);
    });

    it('resolves the package path, not only the dist path', () => {
        const staticConsole = defineStaticConsole({
            packageName: '@authup/server-console-kit',
            marker: '<!--test-config-->',
            viteBase: '/console/test/',
            cwd: process.cwd(),
        });

        expect(staticConsole.resolvePackagePath()).toBeTypeOf('string');
    });
});
