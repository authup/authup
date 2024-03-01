/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '@authup/core';
import type { KeycloakJWTPayload } from '@authup/core';
import { extractTokenPayload } from '@authup/server-kit';
import { useRequestQuery } from '@routup/basic/query';
import type { Request } from 'routup';
import type { IOAuth2IdentityProviderFlow, IdentityProviderFlowIdentity, OAuth2IdentityProviderFlowOptions } from '../types';
import { OAuth2IdentityProviderFlow } from './oauth2';

export class OpenIDIdentityProviderFlow extends OAuth2IdentityProviderFlow implements IOAuth2IdentityProviderFlow {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(options: OAuth2IdentityProviderFlowOptions) {
        super(options);
    }

    async getIdentityForRequest(request: Request): Promise<IdentityProviderFlowIdentity> {
        const { code, state } = useRequestQuery(request);

        const token = await this.client.token.createWithAuthorizeGrant({
            code: code as string,
            state: state as string,
        });

        const payload = extractTokenPayload(token.access_token) as string | KeycloakJWTPayload;

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
