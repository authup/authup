/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RenderPage } from '@authup/server-auth-console';
import type { IAppEvent } from 'routup';
import type { ViteDevServer } from 'vite';

export type ConsoleDevServer = {
    middlewares: ViteDevServer['middlewares'],
    /**
     * The socket this console's hot module replacement actually bound, which
     * is a preference resolved at creation rather than a fixed number, so the
     * caller has to be told rather than assume it.
     */
    hmrPort: number,
    close(): Promise<void>,
};

export type StaticConsoleDevServer = ConsoleDevServer & {
    readShell(event: IAppEvent): Promise<string>,
};

export type AuthConsoleDevServer = ConsoleDevServer & {
    render: RenderPage,
};
