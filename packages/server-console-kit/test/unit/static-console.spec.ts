/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { basic } from '@routup/basic';
import { createHash } from 'node:crypto';
import { App, defineCoreHandler } from 'routup';
import type { IAppEvent } from 'routup';
import { serve } from 'routup/node';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import { defineStaticConsole, defineStaticConsoleCSP } from '../../src/index.ts';
import type { StaticConsole, StaticConsoleServeOptions } from '../../src/index.ts';

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

async function serveOnce(
    staticConsole: StaticConsole,
    options: StaticConsoleServeOptions,
) : Promise<Response> {
    const app = new App();

    app.use(basic({ cookie: true, query: true }));
    app.use(defineCoreHandler({
        method: 'get',
        path: '',
        fn: (event) => staticConsole.serve(event, options),
    }));

    server = serve(app, { port: 0, silent: true });
    await server.ready();

    return fetch(`${(server.url ?? '').replace(/\/+$/, '')}/`);
}

function defineTestConsole(globalName?: string) : StaticConsole {
    return defineStaticConsole({
        packageName: '@authup/does-not-exist',
        marker: '<!--test-config-->',
        viteBase: '/console/test/',
        cwd: process.cwd(),
        readShell: async () => SHELL,
        globalName,
    });
}

describe('defineStaticConsole: globalName', () => {
    it('injects the config under the default global', async () => {
        const response = await serveOnce(defineTestConsole(), OPTIONS);
        const body = await response.text();

        expect(body).toContain('<script>window.__AUTHUP__ = ');
    });

    it('injects the config under a given global', async () => {
        const response = await serveOnce(defineTestConsole('__ACME__'), OPTIONS);
        const body = await response.text();

        expect(body).toContain('<script>window.__ACME__ = ');
        expect(body).not.toContain('__AUTHUP__');
    });

    it.each([
        '',
        '1abc',
        'a-b',
        'a b',
        'a;alert(1)',
        'a.b',
        'a]',
    ])('refuses %j as a global name at define time', (value) => {
        expect(() => defineTestConsole(value)).toThrow(/global name/);
    });
});

describe('defineStaticConsole: csp', () => {
    function readInlineScript(body: string) : string {
        const match = body.match(/<script>([\s\S]*?)<\/script>/);

        if (!match || typeof match[1] !== 'string') {
            throw new Error('no inline script served');
        }

        return match[1];
    }

    it('keeps the frame-ancestors only policy without the option', async () => {
        const response = await serveOnce(defineTestConsole(), OPTIONS);

        expect(response.headers.get('content-security-policy')).toEqual('frame-ancestors \'none\'');
    });

    it('allows exactly the served inline config script', async () => {
        const response = await serveOnce(defineTestConsole('__ACME__'), {
            ...OPTIONS,
            // Request-reflected shapes: the hash must cover the escaped bytes
            // that are actually served, not the raw value.
            config: { apiUrl: 'https://example.com/?x=</script>$\'&<!--' },
            csp: defineStaticConsoleCSP({ origins: ['https://auth.example.com', 'wss://auth.example.com'] }),
        });
        const body = await response.text();

        const hash = createHash('sha256')
            .update(readInlineScript(body), 'utf8')
            .digest('base64');

        const directives = (response.headers.get('content-security-policy') ?? '')
            .split(';')
            .map((directive) => directive.trim());

        expect(directives).toEqual([
            `script-src 'self' 'sha256-${hash}'`,
            'connect-src \'self\' https://auth.example.com wss://auth.example.com',
            'form-action \'self\' https://auth.example.com wss://auth.example.com',
            'object-src \'none\'',
            'base-uri \'none\'',
            'frame-ancestors \'none\'',
        ]);
    });

    it('emits the policy with no extra origins', async () => {
        const response = await serveOnce(defineTestConsole(), { ...OPTIONS, csp: defineStaticConsoleCSP() });

        expect(response.headers.get('content-security-policy')).toContain('connect-src \'self\';');
    });

    it.each([
        'https://a.example.com; script-src *',
        '\'unsafe-inline\'',
        'https://a.example.com https://b.example.com',
        '"https://a.example.com"',
        'https://a.example.com,https://b.example.com',
        '',
    ])('refuses the origin %j when the policy is defined', (origin) => {
        expect(() => defineStaticConsoleCSP({ origins: [origin] })).toThrow(/not a valid content security policy source/);
    });
});
