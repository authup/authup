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

export class IdenityProviderGoogleAuthenticator extends IdentityProviderOAuth2Authenticator {
    constructor(ctx: IdentityProviderOAuth2AuthenticatorContext) {
        ctx.provider.scope = 'openid profile email';
        ctx.provider.authorize_url = 'https://accounts.google.com/o/oauth2/v2/auth';
        ctx.provider.token_url = 'https://oauth2.googleapis.com/token';
        ctx.provider.user_info_url = 'https://openidconnect.googleapis.com/v1/userinfo';

        super(ctx);
    }

    protected async buildIdentityWithTokenGrantResponse(input: TokenGrantResponse): Promise<IdentityProviderIdentity> {
        // todo additional parameter like hd required
        // read: https://developers.google.com/identity/openid-connect/openid-connect?hl=de#createxsrftoken

        const userInfo = await this.client.userInfo.get({
            type: 'Bearer',
            token: input.access_token,
        });

        const payload = extractTokenPayload(input.access_token);

        // todo: extract open id credentials
        throw new Error('Not implemented yet.');
    }
}
