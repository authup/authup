/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Handler, IApp } from 'routup';
import type { Config, ConfigModule } from './modules/index.ts';

/**
 * A handler mounted onto the application's own listener, so one process can
 * serve more than server-core does.
 *
 * The point of the seam is that server-core stays ignorant of what it
 * mounts. The console services own their handlers; the CLI knows about
 * every piece and composes them, which is its job. A controller for a
 * console appearing inside server-core is the smell this exists to
 * prevent (plan 101 D2).
 */
export type ApplicationMount = {
    path: string,
    /**
     * A routup handler or a whole sub-application. A console service
     * exposes the latter, which routup flattens onto this listener.
     */
    handler: Handler | IApp,
};

/**
 * Resolved from the application's own config, because a mount path is a
 * config value (the path component of each console's url) and config is
 * not known until the modules set up.
 */
export type ApplicationMountFactory = (config: Config) => ApplicationMount[];

export type CreateApplicationContext = {
    config?: ConfigModule,
    mounts?: ApplicationMountFactory,
};
