/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionProvider } from '@authup/access';
import type { Logger } from '@authup/server-kit';
import type {

    IIdentityPermissionProvider,
    IIdentityResolver,
    IOAuth2TokenVerifier,
    ISessionManager,
    ISessionRepository,
} from '../../../../../core/index.ts';
import type { CertificateSource } from '../../../request/index.ts';

export type HTTPAuthorizationMiddlewareOptions = {
    clientAuthBasic?: boolean,
    userAuthBasic?: boolean,
    certificateSource?: CertificateSource,
    /**
     * publicUrl. The origin every cookie-authenticated request is checked
     * against (`isSameOriginRequest`). Without it the console session cookie
     * is ignored entirely — the gate cannot be evaluated, so it fails closed.
     */
    baseURL?: string,
};

export type HTTPAuthorizationMiddlewareContext = {
    identityResolver: IIdentityResolver,
    identityPermissionProvider: IIdentityPermissionProvider,
    sessionManager: ISessionManager,
    /**
     * Resolves the opaque console session credential (plan 088). The session
     * MANAGER cannot: the credential is a `select: false` column read by a
     * dedicated, uncached lookup.
     */
    sessionRepository: ISessionRepository,
    oauth2TokenVerifier: IOAuth2TokenVerifier,
    permissionProvider: IPermissionProvider,

    /**
     * Reports a cookie presented from an origin that is not publicUrl's, once
     * per process. A deployment whose browser-facing host differs from
     * `publicUrl` otherwise presents as a console that loads and then silently
     * 401s everything.
     */
    logger?: Logger,

    options?: HTTPAuthorizationMiddlewareOptions
};
