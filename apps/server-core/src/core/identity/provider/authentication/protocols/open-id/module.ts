/*
 * Copyright (c) 2023-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractTokenPayload } from '@authup/server-kit';
import type { TokenGrantResponse } from '@hapic/oauth2';
import type { IdentityProviderIdentity } from '../../../types.ts';
import type { IdentityProviderOAuth2AuthenticatorContext } from '../oauth2/index.ts';
import { IdentityProviderOAuth2Authenticator } from '../oauth2/index.ts';

export class IdentityProviderOpenIDAuthenticator extends IdentityProviderOAuth2Authenticator {
    constructor(ctx: IdentityProviderOAuth2AuthenticatorContext) {
        // OIDC requires the openid scope (Core §3.1.2.1)
        ctx.provider.scope = ctx.provider.scope || 'openid profile email';

        super(ctx);
    }

    protected async buildIdentityWithTokenGrantResponse(input: TokenGrantResponse): Promise<IdentityProviderIdentity> {
        const payload = extractTokenPayload(input.access_token);

        return {
            id: payload.sub!,
            attributeCandidates: {
                name: [
                    payload.preferred_username,
                    payload.nickname,
                    payload.sub,
                ],
                email: [
                    payload.email,
                ],
            },
            data: payload,
            provider: this.provider,
        };
    }
}
