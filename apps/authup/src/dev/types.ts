/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import type { ViteDevServer } from 'vite';

export type ViteModule = typeof import('vite');

export type ConsoleDevServer = {
    middlewares: ViteDevServer['middlewares'],
    close(): Promise<void>,
};

export type StaticConsoleDevServer = ConsoleDevServer & {
    readShell(event: IAppEvent): Promise<string>,
};
