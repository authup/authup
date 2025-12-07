/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { OAuth2IdentityProvider, OpenIDIdentityProvider } from '@authup/core-kit';
import type { ObjectLiteral, Result } from '@authup/kit';
import type { AuthorizeParameters } from '@hapic/oauth2';
import type { IIdentityProviderAccountManager } from '../../../account';

export type OAuth2AuthorizationCodeGrantPayload = {
    code: string
    code_verifier?: string
};

export interface IOAuth2Authenticator<T extends ObjectLiteral = ObjectLiteral> {
    authenticate(params: OAuth2AuthorizationCodeGrantPayload) : Promise<T>;

    safeAuthenticate(params: OAuth2AuthorizationCodeGrantPayload) : Promise<Result<T>>;

    buildRedirectURL(parameters?: Partial<AuthorizeParameters>): string;
}

export type IdentityProviderOAuth2AuthenticatorContext = {
    accountManager: IIdentityProviderAccountManager
    provider: OAuth2IdentityProvider | OpenIDIdentityProvider,
    baseURL: string
};
