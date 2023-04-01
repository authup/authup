/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenVerifyContext } from '../../oauth2';

export type HTTPMiddlewareContext = TokenVerifyContext & {
    cookieHandler?: (cookies: any) => string | undefined
};
