/*
 * Copyright (c) 2023-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { IdentityProviderPreset, IdentityProviderProtocol } from '@authup/core-kit';
import type { IOAuth2Authenticator, IdentityProviderOAuth2AuthenticatorContext } from './protocols/index.ts';
import { IdentityProviderOAuth2Authenticator, IdentityProviderOpenIDAuthenticator } from './protocols/index.ts';
import {
    IdentityProviderFacebookAuthenticator,
    IdentityProviderGithubAuthenticator,
    IdentityProviderGoogleAuthenticator,
    IdentityProviderInstagramAuthenticator,
    IdentityProviderPaypalAuthenticator,
} from './presets/index.ts';

export function createIdentityProviderOAuth2Authenticator(ctx: IdentityProviderOAuth2AuthenticatorContext) : IOAuth2Authenticator<User> {
    if (ctx.provider.preset === IdentityProviderPreset.FACEBOOK) {
        return new IdentityProviderFacebookAuthenticator(ctx);
    }

    if (ctx.provider.preset === IdentityProviderPreset.GITHUB) {
        return new IdentityProviderGithubAuthenticator(ctx);
    }

    if (ctx.provider.preset === IdentityProviderPreset.GOOGLE) {
        return new IdentityProviderGoogleAuthenticator(ctx);
    }

    if (ctx.provider.preset === IdentityProviderPreset.INSTAGRAM) {
        return new IdentityProviderInstagramAuthenticator(ctx);
    }

    if (ctx.provider.preset === IdentityProviderPreset.PAYPAL) {
        return new IdentityProviderPaypalAuthenticator(ctx);
    }

    if (ctx.provider.protocol === IdentityProviderProtocol.OIDC) {
        return new IdentityProviderOpenIDAuthenticator(ctx);
    }

    return new IdentityProviderOAuth2Authenticator(ctx);
}
