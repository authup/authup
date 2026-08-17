/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type {
    IEventService,
    IIdentityProviderAccountLinkStore,
    IIdentityProviderAccountManager,
    IIdentityProviderRepository,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IOAuth2FederatedLoginService,
} from '../../../../../core/index.ts';

export type IdentityProviderControllerOptions = {
    baseURL: string,
};

export type IdentityProviderControllerContext = {
    options: IdentityProviderControllerOptions,

    repository: IIdentityProviderRepository,

    accountManager: IIdentityProviderAccountManager,
    linkStore: IIdentityProviderAccountLinkStore,
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,
    stateManager: IOAuth2AuthorizationStateManager,
    /**
     * Owns the federated-login completion ladder. The controller only maps
     * its result onto a transport.
     */
    loginService: IOAuth2FederatedLoginService,

    eventService?: IEventService,
    logger?: Logger,
};
