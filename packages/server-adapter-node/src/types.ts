/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ITokenVerifier, TokenVerificationData } from '@authup/server-adapter-kit';

export type VerifyRequestOptions = {
    tokenVerifier: ITokenVerifier,
    tokenByRequest?: (req: IncomingMessage) => string | undefined,
};

export type MiddlewareOptions = VerifyRequestOptions & {
    tokenVerifierHandler: (req: IncomingMessage, data: TokenVerificationData) => void | Promise<void>
};

export type Next = (err?: Error) => void;
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: Next) => any;
