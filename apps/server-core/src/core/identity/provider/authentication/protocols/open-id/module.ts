/*
 * Copyright (c) 2023-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mergeOAuth2Scopes } from '@authup/specs';
import type { IdentityProviderOAuth2AuthenticatorContext } from '../oauth2/index.ts';
import { IdentityProviderOAuth2Authenticator } from '../oauth2/index.ts';

export class IdentityProviderOpenIDAuthenticator extends IdentityProviderOAuth2Authenticator {
    constructor(ctx: IdentityProviderOAuth2AuthenticatorContext) {
        // OIDC requires the openid scope (Core §3.1.2.1)
        ctx.provider.scope = mergeOAuth2Scopes(
            'openid',
            ctx.provider.scope || 'openid profile email',
        );

        super(ctx);
    }
}
