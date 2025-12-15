/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionProvider } from '@authup/access';
import type { IIdentityResolver, IOAuth2TokenVerifier } from '../../../../../core';

export type HTTPAuthorizationMiddlewareOptions = {
    cookieDomain?: string;
    clientAuthBasic?: boolean,
    robotAuthBasic?: boolean,
    userAuthBasic?: boolean,
};

export type HTTPAuthorizationMiddlewareContext = {
    identityResolver: IIdentityResolver,
    oauth2TokenVerifier: IOAuth2TokenVerifier,
    permissionProvider: IPermissionProvider,

    options?: HTTPAuthorizationMiddlewareOptions
};
