/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractTokenPayload } from '@authup/server-kit';
import { mergeOAuth2Scopes } from '@authup/specs';
import type { TokenGrantResponse } from '@hapic/oauth2';
import type { IdentityProviderIdentity } from '../../types.ts';
import type { IdentityProviderOAuth2AuthenticatorContext } from '../protocols/index.ts';
import { IdentityProviderOAuth2Authenticator } from '../protocols/index.ts';

export class IdentityProviderFacebookAuthenticator extends IdentityProviderOAuth2Authenticator {
    constructor(ctx: IdentityProviderOAuth2AuthenticatorContext) {
        ctx.provider.scope = mergeOAuth2Scopes('email', ctx.provider.scope);
        ctx.provider.authorizeUrl = 'https://graph.facebook.com/oauth/authorize';
        ctx.provider.tokenUrl = 'https://graph.facebook.com/oauth/access_token';
        ctx.provider.userInfoUrl = 'https://graph.facebook.com/me?fields=id,name,email,first_name,last_name';

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
                email: [
                    userInfo.email,
                ],
                firstName: [
                    userInfo.first_name,
                ],
                lastName: [
                    userInfo.last_name,
                ],
            },
            data: payload,
            provider: this.provider,
        };
    }
}
