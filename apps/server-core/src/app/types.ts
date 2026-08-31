/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigModule } from './modules/index.ts';
import type { IModule } from 'orkos';
import type { IContainer } from 'eldin';
import type { IApp } from 'routup';

/**
 * A sub-application mounted onto this application's own listener, so one
 * process can serve more than server-core does.
 *
 * server-core stays ignorant of what it mounts: the console services own
 * their handlers and the CLI, which knows about every piece, composes them.
 * A controller for a console appearing inside server-core is the smell this
 * exists to prevent (plan 101 D2).
 *
 * WHERE it mounts is the caller's business too, because only the caller
 * knows: a console's mount path is the path component of its configured
 * url.
 */
export type ApplicationMount = {
    path: string,
    handler: IApp,
};

export type CreateApplicationContext = {
    /**
     * A pre-configured DI container. Registering a token before setup wins
     * over the module that would otherwise register it, which is the
     * test-fake seam (see testing.md).
     */
    container?: IContainer,
    config?: ConfigModule,
    /**
     * The HTTP module to run instead of the default one. It is how a
     * caller hands over {@link ApplicationMount}s, since mount ORDER is the
     * module's business and not the caller's.
     */
    http?: IModule
};
