/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RenderPage } from '@authup/server-auth-console';
import type { IApp, IAppEvent } from 'routup';
import type * as Vite from 'vite';
import type { ViteDevServer } from 'vite';

export type ViteModule = typeof Vite;

export type Mount = {
    path: string,
    app: IApp,
};

export type ConsoleDevServer = {
    middlewares: ViteDevServer['middlewares'],
    close(): Promise<void>,
};

export type StaticConsoleDevServer = ConsoleDevServer & {
    readShell(event: IAppEvent): Promise<string>,
};

export type AuthConsoleDevServer = ConsoleDevServer & {
    render: RenderPage,
};
