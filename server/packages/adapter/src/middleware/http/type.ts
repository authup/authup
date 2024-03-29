/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TokenVerificationData, TokenVerifier, TokenVerifierOptions } from '../../verifier';

export type HTTPMiddlewareOptions = {
    tokenByCookie?: (req: IncomingMessage, name?: string) => string | undefined,
    tokenVerifier: TokenVerifier | TokenVerifierOptions,
    tokenVerifierHandler: (req: IncomingMessage, data: TokenVerificationData) => void
};

export type HTTPNext = (err?: Error) => void;
export type HTTPMiddleware = (req: IncomingMessage, res: ServerResponse, next: HTTPNext) => any;
