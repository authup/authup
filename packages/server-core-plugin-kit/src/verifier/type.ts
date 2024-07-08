/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2TokenPayload, OAuth2TokenPermission,
} from '@authup/kit';
import type {
    TokenCreator,
    TokenCreatorOptions,
} from '@authup/core-http-kit';
import type { TokenVerifierCache, TokenVerifierCacheOptions } from './cache';

export type TokenVerifierOptions = {
    baseURL: string,
    creator?: TokenCreator | TokenCreatorOptions,
    cache?: TokenVerifierCache | TokenVerifierCacheOptions
};

export type TokenVerificationData = OAuth2TokenPayload & {
    permissions: OAuth2TokenPermission[]
};

export type TokenVerificationDataInput = OAuth2TokenPayload & {
    permissions?: OAuth2TokenPermission[]
};
