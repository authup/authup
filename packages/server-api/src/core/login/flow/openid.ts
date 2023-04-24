/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '@authup/core';
import type { KeycloakJWTPayload, OAuth2IdentityProvider } from '@authup/core';
import { decodeToken } from '@authup/server-core';
import type { ConfigInput } from '@hapic/oauth2';
import { useRequestQuery } from '@routup/query';
import type { Request } from 'routup';
import { OAuth2IdentityProviderFlow } from './oauth2';
import type { IdentityProviderFlowIdentity } from './types';

export class OpenIDIdentityProviderFlow extends OAuth2IdentityProviderFlow {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(provider: OAuth2IdentityProvider, config?: ConfigInput) {
        super(provider, config);
    }

    async getIdentityForRequest(request: Request): Promise<IdentityProviderFlowIdentity> {
        const { code, state } = useRequestQuery(request);

        const token = await this.client.token.createWithAuthorizeGrant({
            code: code as string,
            state: state as string,
        });

        const payload = decodeToken(token.access_token) as string | KeycloakJWTPayload;

        if (typeof payload === 'string') {
            throw TokenError.payloadInvalid();
        }

        return {
            id: payload.sub,
            name: [
                payload.preferred_username,
                payload.nickname,
                payload.sub,
            ],
            email: payload.email,
            roles: this.extractRolesFromTokenPayload(payload),
        };
    }
}
