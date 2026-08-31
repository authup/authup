/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApplication as createConsoleApplication } from '@authup/server-console-kit';
import type { CreateApplicationContext } from '@authup/server-console-kit';
import type { Application } from 'orkos';
import { readConfigFromEnv } from './config';
import { createHandler } from './handler';
import type { Config } from './types';

/**
 * This console as a runnable service: its own module graph, its own
 * container, its own lifecycle, and nothing of server-core's. It is what
 * `authup console` starts, what the `authup-account-console` bin starts, and what
 * `authup start` composes onto its own listener, so no caller reaches past
 * the graph for a bare handler.
 *
 * `config` defaults to a FACTORY, not a value: resolving it reads the
 * document, and a console started alongside others must not do that at
 * construction time, before the caller has said where to look. Pass
 * `listen: false` to be mounted on someone else's listener.
 */
export function createApplication(
    context: Partial<Omit<CreateApplicationContext<Config>, 'createHandler'>> = {},
) : Application {
    return createConsoleApplication<Config>({
        listen: context.listen,
        config: context.config ?? readConfigFromEnv,
        createHandler: (resolved, theme) => createHandler(resolved, theme),
    });
}
