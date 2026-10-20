/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { API_URL_DEFAULT, createRebasedTransport } from '@authup/core-http-kit';
import type { ClientOptions } from '@authup/core-http-kit';
import type { RuntimeConfig } from 'nuxt/schema';
import { getPathValue } from 'pathtrace';
import type { RuntimeOptions } from '../types';

export type HTTPClientOptions = {
    baseURL: string,
    transport?: ClientOptions['transport']
};

function readPublicApiURL(runtimeConfig: RuntimeConfig) : string {
    const options = runtimeConfig.public.authup as RuntimeOptions;

    let url: string | undefined;
    if (options.apiURL) {
        url = options.apiURL;
    }

    if (options.apiURLRuntimeKey) {
        const pathValue = getPathValue(runtimeConfig.public, options.apiURLRuntimeKey);
        if (typeof pathValue === 'string') {
            url = pathValue;
        }
    }

    return url || API_URL_DEFAULT;
}

function readServerApiURL(runtimeConfig: RuntimeConfig) : string | undefined {
    const options = runtimeConfig.public.authup as RuntimeOptions;

    let url: string | undefined;
    if (options.apiURLRuntimeKey) {
        const pathValue = getPathValue(runtimeConfig, options.apiURLRuntimeKey);
        if (typeof pathValue === 'string') {
            url = pathValue;
        }
    }

    const serverOptions = runtimeConfig.authup as Pick<RuntimeOptions, 'serverApiURL'> | undefined;
    if (serverOptions?.serverApiURL) {
        url = serverOptions.serverApiURL;
    }

    return url;
}

/**
 * The kit's base url is the PUBLIC api url on both sides, because everything
 * derived from it is user-facing: the identity provider buttons, the absolute
 * OAuth2 endpoints and hapic's error messages. A server
 * render only DIALS the server url, through a rebased transport, so a
 * rendered href never names an address the browser cannot reach (hydration
 * does not correct attributes).
 *
 * A transport rather than a pre-built client: the kit builds its store, its
 * hook-attached client and the hook's refresh client separately, and a
 * shared client would put the refresh request on the client the hook is
 * attached to, where a 401 from `/token` waits on its own refresh.
 */
export function buildHTTPClientOptions(
    runtimeConfig: RuntimeConfig,
    isServer: boolean,
) : HTTPClientOptions {
    const baseURL = readPublicApiURL(runtimeConfig);
    if (!isServer) {
        return { baseURL };
    }

    const serverURL = readServerApiURL(runtimeConfig);
    if (!serverURL || serverURL === baseURL) {
        return { baseURL };
    }

    return {
        baseURL,
        transport: createRebasedTransport(baseURL, serverURL),
    };
}
