/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Request } from 'express';
import { AuthorizationHeader } from '@typescript-auth/core';

export type AuthMiddlewareOptions = {
    parseCookie?: (request: Request) => string | undefined,

    authenticateWithCookie?: (request: Request, value: unknown) => Promise<void>,
    authenticateWithAuthorizationHeader?: (request: Request, value: AuthorizationHeader) => Promise<void>
};
