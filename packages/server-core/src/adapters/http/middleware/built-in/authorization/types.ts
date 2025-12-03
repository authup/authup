/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { DataSource } from 'typeorm';
import type { IIdentityResolver, IOAuth2TokenVerifier } from '../../../../../core';

export type HTTPAuthorizationMiddlewareOptions = {
    clientAuthBasic?: boolean,
    robotAuthBasic?: boolean,
    userAuthBasic?: boolean,
};

export type HTTPAuthorizationMiddlewareContext = {
    dataSource: DataSource
    identityResolver: IIdentityResolver,

    oauth2TokenVerifier: IOAuth2TokenVerifier,
    options?: HTTPAuthorizationMiddlewareOptions
};
