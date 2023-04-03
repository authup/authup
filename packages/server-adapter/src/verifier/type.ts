/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AbilityDescriptor,
    OAuth2TokenPayload,
} from '@authup/core';
import type { TokenCreator, TokenCreatorOptions } from '../creator';
import type { TokenVerifierCacheOptions } from './cache';

export type TokenVerifierOptions = {
    baseUrl: string,
    creator?: TokenCreator | TokenCreatorOptions,
    cache?: TokenVerifierCacheOptions
};

export type TokenVerificationData = OAuth2TokenPayload & {
    permissions: AbilityDescriptor[]
};

export type TokenVerificationDataInput = OAuth2TokenPayload & {
    permissions?: AbilityDescriptor[]
};
