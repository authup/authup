/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { extractTokenPayload } from '@authup/server-kit';
import type { OpenIDTokenPayload } from '@authup/specs';
import { mergeOAuth2Scopes } from '@authup/specs';
import type { TokenGrantResponse } from '@hapic/oauth2';
import type { IdentityProviderIdentity } from '../../types.ts';
import type { IdentityProviderOAuth2AuthenticatorContext } from '../protocols/index.ts';
import { IdentityProviderOAuth2Authenticator } from '../protocols/index.ts';

export class IdentityProviderGoogleAuthenticator extends IdentityProviderOAuth2Authenticator {
    constructor(ctx: IdentityProviderOAuth2AuthenticatorContext) {
        ctx.provider.scope = mergeOAuth2Scopes('openid profile email', ctx.provider.scope);
        ctx.provider.authorizeUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        ctx.provider.tokenUrl = 'https://oauth2.googleapis.com/token';
        ctx.provider.userInfoUrl = 'https://openidconnect.googleapis.com/v1/userinfo';

        super(ctx);
    }

    protected async buildIdentityWithTokenGrantResponse(input: TokenGrantResponse): Promise<IdentityProviderIdentity> {
        const payload = extractTokenPayload(input.access_token);

        const attributeCandidates : Record<keyof User, unknown[]> = {};

        /**
         * @see https://developers.google.com/identity/openid-connect/openid-connect?hl=de#server-flow
         */
        if (input.id_token) {
            const idTokenPayload = extractTokenPayload(input.id_token) as OpenIDTokenPayload;

            attributeCandidates.name = [
                idTokenPayload.name,
            ];

            attributeCandidates.email = [
                idTokenPayload.email,
            ];

            attributeCandidates.firstName = [
                idTokenPayload.given_name,
            ];
            attributeCandidates.lastName = [
                idTokenPayload.family_name,
            ];
        }

        return {
            id: payload.sub!,
            attributeCandidates,
            data: payload,
            provider: this.provider,
        };
    }
}
