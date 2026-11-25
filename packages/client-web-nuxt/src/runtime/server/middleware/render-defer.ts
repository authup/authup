/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineHandler, getCookie, useRuntimeConfig } from 'nuxt/server';
import { shouldDeferRender } from '../../helpers/render-defer';
import type { RuntimeOptions } from '../../types';

/**
 * Render a request client-only when only a token refresh could serve its
 * session (#3925). It reads cookies and writes nothing, so the refresh-token
 * cookie the browser holds stays the one it will present.
 */
export default defineHandler((event) => {
    const options = useRuntimeConfig().public.authup as RuntimeOptions | undefined;
    const prefix = options?.cookiePrefix || '';

    if (!shouldDeferRender((name) => getCookie(event, `${prefix}${name}`))) {
        return;
    }

    event.context.nuxt ||= {};
    event.context.nuxt.noSSR = true;
});
