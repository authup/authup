/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createConsoleApplication } from '@authup/server-console-kit';
import type { Application } from 'orkos';
import { readAdminConsoleConfigFromEnv } from './config';
import { createAdminConsoleHandler } from './handler';
import type { Config } from './types';

/**
 * This console as a runnable service: its own module graph, its own
 * container, its own lifecycle, and nothing of server-core's. It is what
 * `authup console` starts and what the `authup-admin-console` bin starts, so
 * the two paths cannot diverge.
 *
 * The configuration is a FACTORY by default, not a value: resolving it reads
 * the document, and a console started alongside others must not do that at
 * construction time, before the caller has said where to look.
 */
export function createAdminConsoleApplication(
    config: Config | (() => Config | Promise<Config>) = readAdminConsoleConfigFromEnv,
) : Application {
    return createConsoleApplication<Config>(config, { createHandler: (resolved) => createAdminConsoleHandler(resolved) });
}
