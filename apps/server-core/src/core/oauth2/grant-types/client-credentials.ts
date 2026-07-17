/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import type { Client } from '@authup/core-kit';
import {
    IdentityType,
    ScopeName, 
    SessionAuthMethod,
} from '@authup/core-kit';
import { OAuth2BaseGrant } from './base.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { OAuth2GrantRunWIthOptions } from './types.ts';

export class ClientCredentialsGrant extends OAuth2BaseGrant<Client> {
    async runWith(input: Client, options: OAuth2GrantRunWIthOptions = {}) : Promise<OAuth2TokenGrantResponse> {
        const session = await this.sessionManager.create({
            userAgent: options.userAgent,
            ipAddress: options.ipAddress,
            realmId: input.realmId,
            sub: input.id,
            subKind: IdentityType.CLIENT,
            authMethod: SessionAuthMethod.CLIENT,
        });

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            user_agent: session.userAgent,
            remote_address: session.ipAddress,
            session_id: session.id,
            scope: ScopeName.GLOBAL,
            sub: input.id,
            sub_kind: OAuth2SubKind.CLIENT,
            realm_id: input.realm.id,
            realm_name: input.realm.name,
            client_id: input.id,
            ...(options.confirmation ? { cnf: options.confirmation } : {}),
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
        });
    }
}
