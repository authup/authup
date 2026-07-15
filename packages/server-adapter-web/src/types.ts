/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ITokenVerifier } from '@authup/server-adapter-kit';

export type VerifyRequestOptions = {
    tokenVerifier: ITokenVerifier,
    tokenByRequest?: (request: Request) => string | undefined,
    certificateThumbprintByRequest?: (request: Request) => string | undefined | Promise<string | undefined>,
};
