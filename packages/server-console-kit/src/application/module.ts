/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Application } from 'orkos';
import { ConfigModule } from './config';
import { HTTPModule } from './http';
import { ThemeModule } from './theme';
import type { Config, ConfigFactory, HTTPModuleContext } from './types';

/**
 * A console as an APPLICATION: a module graph with its own configuration,
 * its own container and its own lifecycle, exactly as server-core is one.
 *
 * Composed straight from orkos rather than through a builder. server-core's
 * `ApplicationBuilder` is thirteen named slots over thirteen of its own
 * modules; a console has two, so a builder would be a factory for one
 * product. What the two share is orkos itself.
 *
 * The graph is what a console gains over a bare listener: config is resolved
 * once and shared through the container, a pre-registered token wins over the
 * module that would register it (the test seam), teardown runs in reverse
 * dependency order, and a third module — the operator theme is the obvious
 * next one — slots in without any caller changing.
 */
export function createApplication<C extends Config>(
    config: C | ConfigFactory<C>,
    ctx: HTTPModuleContext<C>,
) : Application {
    return new Application({
        modules: [
            new ConfigModule<C>(config),
            new ThemeModule(),
            new HTTPModule<C>(ctx),
        ],
    });
}
