/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type {
    IIdentityProviderAccountManager,
    IIdentityProviderRepository,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IRealmRepository,
} from '../../../../../core/index.ts';

export type IdentityProviderControllerOptions = {
    baseURL: string,
};

export type IdentityProviderControllerContext = {
    options: IdentityProviderControllerOptions,

    repository: IIdentityProviderRepository,
    realmRepository: IRealmRepository,

    accountManager: IIdentityProviderAccountManager,
    codeIssuer: IOAuth2AuthorizationCodeIssuer,
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,
    stateManager: IOAuth2AuthorizationStateManager,
};
