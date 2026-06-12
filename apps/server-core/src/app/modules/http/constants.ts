/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IClient } from '@authup/core-http-kit';
import { TypedToken } from 'eldin';
import type { serve } from 'routup/node';

export type HTTPServer = ReturnType<typeof serve>;

export const HTTPInjectionKey = {
    Server: new TypedToken<HTTPServer>('Server'),
    /**
     * Optional HTTP-client override for the SSR'd UI pages (test
     * injection — production registers nothing). Register it with a
     * `useFactory` provider and `lifetime: 'transient'` so every
     * resolve yields a FRESH client: client-web-kit's authentication
     * hook writes per-user Authorization state onto the client it
     * attaches to, so a singleton-lifetime instance shared across
     * concurrent renders would leak tokens between sessions.
     */
    UIHttpClient: new TypedToken<IClient>('UIHttpClient'),
} as const;
