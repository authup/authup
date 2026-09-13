/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationHeader, RequestBaseOptions } from 'hapic';
import { stringifyAuthorizationHeader } from 'hapic';

export function buildAuthorizationHeaderRequestConfig(
    options?: { authorizationHeader?: string | AuthorizationHeader },
) : RequestBaseOptions | undefined {
    if (!options || !options.authorizationHeader) {
        return undefined;
    }

    return {
        headers: {
            Authorization: typeof options.authorizationHeader === 'string' ?
                options.authorizationHeader :
                stringifyAuthorizationHeader(options.authorizationHeader),
        },
    };
}
