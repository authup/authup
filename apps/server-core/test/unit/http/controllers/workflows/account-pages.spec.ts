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
    const match = body.match(/window\.__AUTHUP__ = (.+);<\/script>/);
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
        const response = await httpRequest(suite, 'GET', '/console/account');
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toEqual('DENY');
        expect(response.headers.get('cache-control')).toEqual('no-store');

        const body = await response.text();
        const config = extractAccountConfig(body);

        expect(typeof config.apiUrl).toEqual('string');
        expect(config.basePath).toEqual('/console/account');
        expect(config.features.accountConsole).toEqual(true);
    });

    it('should serve the same shell for sub-paths', async () => {
        for (const path of ['/console/account/sessions', '/console/account/UNKNOWN']) {
            const response = await httpRequest(suite, 'GET', path);
            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toContain('text/html');
        }
    });

    it('should serve the bundle assets', async () => {
        const shell = await (await httpRequest(suite, 'GET', '/console/account')).text();

        const match = shell.match(/src="(\/console\/account\/assets\/[^"]+\.js)"/);
        expect(match).toBeTruthy();

        const response = await httpRequest(suite, 'GET', match![1]);
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('javascript');
    });

    it('should carry no server-rendered per-user state', async () => {
        // The shell is a static SPA: no SSR, no hydration payload — only the
        // operator-level runtime config is injected under the shared
        // `window.__AUTHUP__` global (one occurrence, config-shaped: an SSR
        // hydration payload would carry config/data keys and fail the
        // exact-keys assertion below). Nothing actor-scoped can leak into a
        // (potentially cached) response body.
        const body = await (await httpRequest(suite, 'GET', '/console/account/sessions')).text();

        expect(body.match(/window\.__AUTHUP__ =/g)).toHaveLength(1);

        // ... and the injected config itself carries EXACTLY the documented
        // operator-level fields — an actor-scoped addition fails here.
        const config = extractAccountConfig(body);
        // `cookieSession` is among them as a CAPABILITY assertion — this
        // server implements the cookie-mode routes — not as per-user state:
        // it is the same constant for every request, and the console pairs it
        // with its own same-origin check before acting on it.
        expect(Object.keys(config).sort()).toEqual([
            'apiUrl',
            'basePath',
            'cookieSession',
            'features',
        ]);
        expect(Object.keys(config.features).sort()).toEqual([
            'accountConsole',
            'adminConsole',
            'emailVerification',
            'passwordRecovery',
            'registration',
        ]);
    });

    it('should inject a ref pointing at a trusted origin', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            '/console/account?ref=http%3A%2F%2Flocalhost%3A3000%2Fsettings',
        );
        expect(response.status).toEqual(200);

        const config = extractAccountConfig(await response.text());
        expect(config.ref).toEqual('http://localhost:3000/settings');
    });

    it('should drop a ref pointing at an untrusted origin', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            '/console/account?ref=https%3A%2F%2Fevil.test%2Fx',
        );
        expect(response.status).toEqual(200);

        const config = extractAccountConfig(await response.text());
        expect(config.ref).toBeUndefined();
    });

    it('should drop a non-http ref', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            '/console/account?ref=javascript%3Aalert(1)',
        );
        expect(response.status).toEqual(200);

        const config = extractAccountConfig(await response.text());
        expect(config.ref).toBeUndefined();
    });

    it('should validate ref on a sub-path too', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            '/console/account/sessions?ref=https%3A%2F%2Fevil.test%2Fx',
        );
        expect(response.status).toEqual(200);

        const config = extractAccountConfig(await response.text());
        expect(config.ref).toBeUndefined();
    });

    it('should not let a crafted ref break the inline script', async () => {
        // A `$'` in a String.prototype.replace replacement expands to the
        // text following the match. `replaceTemplateMarker` must prevent it.
        const response = await httpRequest(
            suite,
            'GET',
            `/console/account?ref=${encodeURIComponent("http://localhost:3000/$'$&$`")}`,
        );
        expect(response.status).toEqual(200);

        const body = await response.text();
        // The payload must still be exactly one parseable JSON object.
        const config = extractAccountConfig(body);
        expect(config.basePath).toEqual('/console/account');
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
        const response = await httpRequest(suite, 'GET', '/console/account');
        expect(response.status).toEqual(200);

        const config = extractAccountConfig(await response.text());
        expect(config.features.accountConsole).toEqual(false);
    });

    it('should report the flag on the status endpoint', async () => {
        const response = await suite.client.status.get();

        expect(response.features.accountConsole).toEqual(false);
    });

    // The admin console's redirect stub maps `/settings` to PATH_MAP[''] = '/',
    // producing `<apiUrl>/console/account/` WITH a trailing slash. Every other test
    // here hits `/console/account` without one, so the route the stub actually emits
    // needs its own coverage.
    it('should serve the shell for /console/account/ with a trailing slash', async () => {
        const response = await httpRequest(suite, 'GET', '/console/account/');
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');
    });

    it('should validate ref on the trailing-slash route', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            '/console/account/?ref=http%3A%2F%2Flocalhost%3A3000',
        );
        expect(response.status).toEqual(200);

        const config = extractAccountConfig(await response.text());
        expect(config.ref).toEqual('http://localhost:3000/');
    });

    it('should serve every route the settings redirect maps onto', async () => {
        for (const path of [
            '/console/account/',
            '/console/account/password',
            '/console/account/authenticators',
            '/console/account/sessions',
            '/console/account/applications',
        ]) {
            const response = await httpRequest(suite, 'GET', path);
            expect(response.status).toEqual(200);
        }
    });
});
