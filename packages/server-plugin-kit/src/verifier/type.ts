/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Ability,
    OAuth2TokenPayload,
} from '@authup/kit';
import type {
    TokenCreator,
    TokenCreatorOptions,
} from '@authup/core-http-kit';
import type { TokenVerifierCacheOptions } from './cache';

export type TokenVerifierOptions = {
    baseURL: string,
    creator?: TokenCreator | TokenCreatorOptions,
    cache?: TokenVerifierCacheOptions
};

export type TokenVerificationData = OAuth2TokenPayload & {
    permissions: Ability[]
};

export type TokenVerificationDataInput = OAuth2TokenPayload & {
    permissions?: Ability[]
};
