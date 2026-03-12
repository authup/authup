/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2TokenPayload,
    OAuth2TokenPermission,
} from '@authup/specs';
import type {
    TokenCreator,
} from '@authup/core-http-kit';
import type { ITokenVerifierCache } from './cache';

export interface ITokenVerifier {
    verify(token: string) : Promise<TokenVerificationData>
}

export type TokenVerifierContext = {
    baseURL: string,
    creator?: TokenCreator,
    cache?: ITokenVerifierCache
};

export type TokenVerificationData = OAuth2TokenPayload & {
    permissions: OAuth2TokenPermission[]
};

export type TokenVerificationDataInput = OAuth2TokenPayload & {
    permissions?: OAuth2TokenPermission[]
};
