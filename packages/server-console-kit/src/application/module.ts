/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { serve } from 'routup/node';
import type { ConsoleApplication, ConsoleApplicationContext } from './types';

/**
 * Wrap a console handler in the lifecycle a service needs: build, listen,
 * close.
 *
 * Every console is its own service (plan 101 resolved question 8), so each
 * owns a listener rather than riding someone else's. This exists once here
 * because all three consoles need the identical thing, and a copy per console
 * is three places for the teardown rule below to drift.
 */
export function defineConsoleApplication(ctx: ConsoleApplicationContext) : ConsoleApplication {
    let server : ReturnType<typeof serve> | undefined;

    return {
        get url() {
            return server?.url;
        },
        async setup() {
            server = serve(await ctx.createHandler(), {
                port: ctx.port,
                hostname: ctx.host,
                silent: true,
            });

            await server.ready();
        },
        async teardown() {
            // `true` closes active connections. A console serves documents and
            // assets over keep-alive sockets, so waiting for them to go idle
            // means waiting out the client's own timeout: a container stop
            // would sit at the force-exit deadline every time.
            await server?.close(true);
            server = undefined;
        },
    };
}
