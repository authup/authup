/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { InjectionKey } from '@authup/server-console-kit';
import type { IThemeProvider } from '@authup/server-console-kit';
import type { Application } from 'orkos';
import { App } from 'routup';
import { serve } from 'routup/node';
import { 
    afterEach, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { createApplication } from '../../src';

const MARKER = '/*INJECTED-THEME-MARKER*/';

/**
 * A provider nothing on disk could have produced. If it reaches the served
 * page, the module actually hands its provider to the handler; the handler
 * falls back to building its own from the configuration, so a broken hand-off
 * still renders a perfectly good un-themed page and looks like success.
 */
const provider = {
    getManifest: async () => undefined,
    getHead: async () => `<style>${MARKER}</style>`,
    getAssetPath: async () => undefined,
    getDirectoryPath: () => '/nonexistent',
} as unknown as IThemeProvider;

function buildConfig() {
    return {
        url: 'http://127.0.0.1:0/console/account',
        apiUrl: 'http://127.0.0.1:0',
        enabled: true,
        port: 0,
        host: '127.0.0.1',
        distPath: '',
        trustedOrigins: [],
        theme: { directoryPath: '', fragmentsEnabled: false },
    };
}

describe('createApplication', () => {
    let application : Application | undefined;

    afterEach(async () => {
        await application?.teardown();
        application = undefined;
    });

    it('should resolve the configuration a caller registered', async () => {
        application = createApplication(() => {
            throw new Error('the factory must not run when a config is registered');
        });

        application.container.register(InjectionKey.Config, { useValue: buildConfig() });

        await application.setup();

        const server = application.container.resolve(InjectionKey.Server);

        expect((await fetch(`${server.url}healthy`)).status).toEqual(200);
    });

    it('should serve the page through the theme provider the graph resolved', async () => {
        application = createApplication(buildConfig);
        application.container.register(InjectionKey.Theme, { useValue: provider });

        await application.setup();

        const server = application.container.resolve(InjectionKey.Server);
        const response = await fetch(`${server.url}console/account`);

        expect(response.status).toEqual(200);
        expect(await response.text()).toContain(MARKER);
    });

    /**
     * The mounted mode `authup start` uses. The application is set up
     * COMPLETELY -- config resolved, theme resolved, handler built and
     * registered -- it just does not own a socket, so a composing caller can
     * put it on someone else's. Asking a console for a bare handler instead
     * would run neither module, which is what this guards.
     */
    it('should build without a listener when it is to be mounted', async () => {
        application = createApplication({ config: buildConfig, listen: false });
        application.container.register(InjectionKey.Theme, { useValue: provider });

        await application.setup();

        expect(application.container.has(InjectionKey.Server)).toBe(false);

        const mounted = application.container.resolve(InjectionKey.App);

        const outer = new App();
        outer.use('/console/account', mounted);

        const server = serve(outer, {
            port: 0, 
            hostname: '127.0.0.1', 
            silent: true, 
        });
        await server.ready();

        try {
            const response = await fetch(`${server.url}console/account`);

            expect(response.status).toEqual(200);
            // the theme the console graph resolved, on someone else's listener
            expect(await response.text()).toContain(MARKER);
        } finally {
            await server.close(true);
        }
    });
});
