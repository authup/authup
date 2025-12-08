/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { container } from 'tsyringe';
import { ConfigDefaults, useConfig } from '../../../../../config';
import type {
    ICredentialsAuthenticator,
    IIdentityResolver,
    IOAuth2AuthorizationCodeVerifier,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
} from '../../../../../core';
import {
    ClientAuthenticator,
    CredentialsAuthenticator,
    IDENTITY_PROVIDER_LDAP_COLLECTION_AUTHENTICATOR_TOKEN,
    IDENTITY_RESOLVER_TOKEN,
    OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_VERIFIER_TOKEN,
    OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN,
    OAUTH2_TOKEN_REVOKER_TOKEN,
    OAUTH2_TOKEN_VERIFIER_TOKEN,
    RobotAuthenticator,
    UserAuthenticator,
} from '../../../../../core';
import { TokenController } from './module';

export function createHTTPTokenController() {
    const config = useConfig();

    let cookieDomain : string | undefined;
    if (config.cookieDomain) {
        cookieDomain = config.cookieDomain;
    } else if (config.authorizeRedirectUrl !== ConfigDefaults.AUTHORIZE_REDIRECT_URL) {
        cookieDomain = new URL(config.publicUrl).hostname;
    }

    const codeVerifier = container.resolve<IOAuth2AuthorizationCodeVerifier>(
        OAUTH2_AUTHORIZATION_CODE_VERIFIER_TOKEN,
    );

    const accessTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN);
    const refreshTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN);

    const tokenRevoker = container.resolve<IOAuth2TokenRevoker>(OAUTH2_TOKEN_REVOKER_TOKEN);
    const tokenVerifier = container.resolve<IOAuth2TokenVerifier>(OAUTH2_TOKEN_VERIFIER_TOKEN);

    const identityResolver = container.resolve<IIdentityResolver>(IDENTITY_RESOLVER_TOKEN);
    const identityProviderLdapCollectionAuthenticator = container.resolve<ICredentialsAuthenticator<User>>(
        IDENTITY_PROVIDER_LDAP_COLLECTION_AUTHENTICATOR_TOKEN,
    );

    const clientAuthenticator = new ClientAuthenticator(identityResolver);
    const robotAuthenticator = new RobotAuthenticator(identityResolver);
    const userAuthenticator = new CredentialsAuthenticator([
        identityProviderLdapCollectionAuthenticator,
        new UserAuthenticator(identityResolver),
    ]);

    return new TokenController({
        cookieDomain,

        codeVerifier,

        accessTokenIssuer,
        refreshTokenIssuer,

        tokenVerifier,
        tokenRevoker,

        identityResolver,

        clientAuthenticator,
        robotAuthenticator,
        userAuthenticator,
    });
}
