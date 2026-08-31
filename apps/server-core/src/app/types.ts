/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigModule } from './modules/index.ts';
import type { IModule } from 'orkos';
import type { IContainer } from 'eldin';

export type CreateApplicationContext = {
    /**
     * A pre-configured DI container. Registering a token before setup wins
     * over the module that would otherwise register it, which is the
     * test-fake seam (see testing.md).
     */
    container?: IContainer,
    config?: ConfigModule,
    /**
     * The HTTP module to run instead of the default one, which is how a
     * caller opts into building the application without listening
     * (`new HTTPModule({ listen: false })`) so it can compose onto the same
     * listener before starting it.
     */
    http?: IModule
};
