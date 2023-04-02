/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenVerifierOptions, TokenVerifierOutput } from '../../verifier';

export type HTTPMiddlewareContext = {
    cookieHandler?: (cookies: any) => string | undefined,
    tokenVerifier: TokenVerifierOptions
};

export type RequestEnv = TokenVerifierOutput;
