/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationHeader, RequestBaseOptions } from 'hapic';
import { stringifyAuthorizationHeader } from 'hapic';
import type { APIRequestOptions } from './types-base';

/**
 * The per-request config of a call: only `signal`, `timeout` and an
 * explicit `authorizationHeader` are taken from the caller's options.
 */
export function buildRequestConfig(
    options?: APIRequestOptions & { authorizationHeader?: string | AuthorizationHeader },
) : RequestBaseOptions | undefined {
    if (!options) {
        return undefined;
    }

    const output : RequestBaseOptions = {};

    if (options.signal) {
        output.signal = options.signal;
    }

    if (typeof options.timeout !== 'undefined') {
        output.timeout = options.timeout;
    }

    if (options.authorizationHeader) {
        output.headers = {
            Authorization: typeof options.authorizationHeader === 'string' ?
                options.authorizationHeader :
                stringifyAuthorizationHeader(options.authorizationHeader),
        };
    }

    return output;
}
