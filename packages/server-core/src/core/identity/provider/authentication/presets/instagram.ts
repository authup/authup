/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractTokenPayload } from '@authup/server-kit';
import type { TokenGrantResponse } from '@hapic/oauth2';
import type { IdentityProviderIdentity } from '../../types';
import type { IdentityProviderOAuth2AuthenticatorContext } from '../protocols';
import { IdentityProviderOAuth2Authenticator } from '../protocols';

export class IdentityProviderInstagramAuthenticator extends IdentityProviderOAuth2Authenticator {
    constructor(ctx: IdentityProviderOAuth2AuthenticatorContext) {
        ctx.provider.scope = 'user_profile';
        ctx.provider.authorize_url = 'https://api.instagram.com/oauth/authorize';
        ctx.provider.token_url = 'https://api.instagram.com/oauth/access_token';
        ctx.provider.user_info_url = 'https://graph.instagram.com/me?fields=id,username';

        super(ctx);
    }

    protected async buildIdentityWithTokenGrantResponse(input: TokenGrantResponse): Promise<IdentityProviderIdentity> {
        const userInfo = await this.client.userInfo.get({
            type: 'Bearer',
            token: input.access_token,
        });

        const payload = extractTokenPayload(input.access_token);

        return {
            id: userInfo.id,
            attributeCandidates: {
                name: [
                    userInfo.username,
                    userInfo.id,
                ],
            },
            data: payload,
            provider: this.provider,
        };
    }
}
