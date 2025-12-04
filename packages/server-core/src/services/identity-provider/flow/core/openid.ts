/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractTokenPayload } from '@authup/server-kit';
import type { Request } from 'routup';
import type { IdentityProviderIdentity } from '../../../../core';
import type { IOAuth2IdentityProviderFlow, OAuth2IdentityProviderFlowOptions } from '../types';
import { OAuth2IdentityProviderFlow } from './oauth2';

export class OpenIDIdentityProviderFlow extends OAuth2IdentityProviderFlow implements IOAuth2IdentityProviderFlow {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(options: OAuth2IdentityProviderFlowOptions) {
        super(options);
    }

    async getIdentityForRequest(request: Request): Promise<IdentityProviderIdentity> {
        const response = await this.getTokenResponseForRequest(request);
        const payload = extractTokenPayload(response.access_token);

        return {
            id: payload.sub,
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
        };
    }
}
