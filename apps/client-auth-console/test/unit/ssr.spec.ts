/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { renderToString } from 'vue/server-renderer';
import { createApp } from '../../src/app';

/**
 * The SSR-cleanliness guard (plan 101 D2).
 *
 * This app is rendered by @authup/server-auth-console, which calls
 * `render()` in a node process with no DOM. Nothing here may reach for a
 * browser global at setup time, and every page has to produce markup
 * server-side, or the service answers a blank shell with no error anywhere.
 *
 * The app is also shipped as a static SPA shell where no SSR service runs,
 * which is exactly why this has to be pinned rather than assumed: the SPA
 * path would keep working while the SSR path silently stopped.
 */
describe('server render', () => {
    async function render(url: string) : Promise<string> {
        const { app, router } = createApp({
            config: { baseURL: 'https://example.com', basePath: '/console/auth' },
            data: {},
        });

        await router.push(url);
        await router.isReady();

        return renderToString(app);
    }

    it.each([
        '/register',
        '/activate',
        '/password-forgot',
        '/password-reset',
        '/logout',
    ])('renders %s without a DOM', async (url) => {
        const html = await render(url);

        expect(html).toBeTruthy();
        // the shell, not an empty mount point: a page that threw during
        // setup would leave the container behind with nothing in it
        expect(html.length).toBeGreaterThan(64);
    });

    it('renders the authorize page', async () => {
        // It fires HTTP calls during the render (identity providers, the
        // consent probe). Without an injected client they fail and the page
        // must still produce its shell rather than reject the render.
        const html = await render('/authorize');

        expect(html).toBeTruthy();
    });
});
