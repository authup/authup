/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HookResult } from '@nuxt/schema';
import type { MiddlewareHookPayload } from './runtime/types';
import type { RuntimeOptions } from '~/src/runtime/types';

declare module '#app' {
    interface RuntimeNuxtHooks {
        'authup:middleware:start': (data: MiddlewareHookPayload) => HookResult,
        'authup:middleware:redirect': (data: MiddlewareHookPayload) => HookResult,
        'authup:middleware:end': (data: MiddlewareHookPayload) => HookResult,
    }
}

declare module '@nuxt/schema' {
    interface PublicRuntimeConfig {
        authup: RuntimeOptions
    }
}
