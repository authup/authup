/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { App } from 'routup';
import { createAccountConsoleHandler } from './handler';
import type { Config } from './types';

/**
 * The standalone service: the same handler the CLI mounts in process, behind
 * a listener of its own.
 */
export async function createAccountConsoleServer(config: Config) : Promise<App> {
    const app = new App();

    app.use(await createAccountConsoleHandler(config));

    return app;
}
