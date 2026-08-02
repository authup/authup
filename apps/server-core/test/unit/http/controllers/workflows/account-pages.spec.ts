/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

function extractAccountConfig(body: string) : Record<string, any> {
    const match = body.match(/window\.__AUTHUP_ACCOUNT__ = (.+);<\/script>/);
    expect(match).toBeTruthy();
    return JSON.parse(match![1]);
}

describe('src/http/controllers/workflows/account (SPA shell)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should serve the account console shell with injected config', async () => {
        const response = await httpRequest(suite, 'GET', '/account');
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toEqual('DENY');

        const body = await response.text();
        const config = extractAccountConfig(body);

        expect(typeof config.apiUrl).toEqual('string');
        expect(config.basePath).toEqual('/account');
        expect(config.features.accountConsole).toEqual(true);
    });

    it('should serve the same shell for sub-paths', async () => {
        for (const path of ['/account/sessions', '/account/UNKNOWN']) {
            const response = await httpRequest(suite, 'GET', path);
            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toContain('text/html');
        }
    });

    it('should serve the bundle assets', async () => {
        const shell = await (await httpRequest(suite, 'GET', '/account')).text();

        const match = shell.match(/src="(\/account\/assets\/[^"]+\.js)"/);
        expect(match).toBeTruthy();

        const response = await httpRequest(suite, 'GET', match![1]);
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('javascript');
    });

    it('should carry no server-rendered per-user state', async () => {
        // The shell is a static SPA: no SSR, no hydration payload — only the
        // operator-level runtime config is injected. Nothing actor-scoped
        // can leak into a (potentially cached) response body.
        const body = await (await httpRequest(suite, 'GET', '/account/sessions')).text();

        expect(body).not.toContain('window.__AUTHUP__ =');

        // ... and the injected config itself carries EXACTLY the documented
        // operator-level fields — an actor-scoped addition fails here.
        const config = extractAccountConfig(body);
        expect(Object.keys(config).sort()).toEqual(['apiUrl', 'basePath', 'features']);
        expect(Object.keys(config.features).sort()).toEqual([
            'accountConsole', 
            'emailVerification', 
            'passwordRecovery', 
            'registration',
        ]);
    });
});

describe('src/http/controllers/workflows/account (disabled)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.accountConsoleEnabled = false;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    // The client half (the shell rendering the disabled notice off this
    // flag) is a thin v-if over the resolved config — pinned by the account
    // app's own config.spec.ts, not exercisable from a server-core test.
    it('should inject the disabled flag', async () => {
        const response = await httpRequest(suite, 'GET', '/account');
        expect(response.status).toEqual(200);

        const config = extractAccountConfig(await response.text());
        expect(config.features.accountConsole).toEqual(false);
    });

    it('should report the flag on the status endpoint', async () => {
        const response = await suite.client.status.get();

        expect(response.features.accountConsole).toEqual(false);
    });
});
