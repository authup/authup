/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-http-kit';
import { TypedToken } from 'eldin';
import type { serve } from 'routup/node';

export type HTTPServer = ReturnType<typeof serve>;

export const HTTPInjectionKey = {
    Server: new TypedToken<HTTPServer>('Server'),
    /**
     * Optional per-request HTTP-client factory override for the SSR'd UI
     * pages (test injection — production registers nothing). A factory —
     * not an instance — because client-web-kit's authentication hook
     * writes per-user Authorization state onto the client it attaches to;
     * a single instance shared across concurrent renders would leak
     * tokens between sessions.
     */
    UIHttpClientFactory: new TypedToken<() => Client>('UIHttpClientFactory'),
} as const;
