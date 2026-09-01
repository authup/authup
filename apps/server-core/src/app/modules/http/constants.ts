/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IClient } from '@authup/core-http-kit';
import { TypedToken } from 'eldin';
import type { serve } from 'routup/node';
import type { IApp } from 'routup';

export type HTTPServer = ReturnType<typeof serve>;

export const HTTPInjectionKey : {
    App: TypedToken<IApp>,
    Server: TypedToken<HTTPServer>,
    InternalHttpClient: TypedToken<IClient>,
} = {
    App: new TypedToken<IApp>('IApp'),
    Server: new TypedToken<HTTPServer>('Server'),
    /**
     * HTTP client for the SSR'd UI pages. `HTTPModule.setup` registers a
     * default whose transport dispatches against the server's own listen
     * address (see `createInternalHttpClient`); a registration made
     * BEFORE setup wins (test injection). Register it with a
     * `useFactory` provider and `lifetime: 'transient'` so every
     * resolve yields a FRESH client: client-web-kit's authentication
     * hook writes per-user Authorization state onto the client it
     * attaches to, so a singleton-lifetime instance shared across
     * concurrent renders would leak tokens between sessions.
     */
    InternalHttpClient: new TypedToken<IClient>('InternalHttpClient'),
} as const;
