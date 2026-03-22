/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionRepository } from '@authup/access';
import type { IIdentityPermissionProvider, IIdentityResolver, IOAuth2TokenVerifier, ISessionManager } from '../../../../../core/index.ts';

export type HTTPAuthorizationMiddlewareOptions = {
    cookieDomain?: string;
    clientAuthBasic?: boolean,
    robotAuthBasic?: boolean,
    userAuthBasic?: boolean,
};

export type HTTPAuthorizationMiddlewareContext = {
    identityResolver: IIdentityResolver,
    identityPermissionProvider: IIdentityPermissionProvider,
    sessionManager: ISessionManager,
    oauth2TokenVerifier: IOAuth2TokenVerifier,
    permissionProvider: IPermissionRepository,

    options?: HTTPAuthorizationMiddlewareOptions
};
