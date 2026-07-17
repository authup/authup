/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import type { Robot } from '@authup/core-kit';
import {
    IdentityType,
    ScopeName, 
    SessionAuthMethod,
} from '@authup/core-kit';
import { OAuth2BaseGrant } from './base.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { OAuth2GrantRunWIthOptions } from './types.ts';

export class RobotCredentialsGrant extends OAuth2BaseGrant<Robot> {
    async runWith(input: Robot, options: OAuth2GrantRunWIthOptions = {}) : Promise<OAuth2TokenGrantResponse> {
        const session = await this.sessionManager.create({
            userAgent: options.userAgent,
            ipAddress: options.ipAddress,
            realmId: input.realmId,
            sub: input.id,
            subKind: IdentityType.ROBOT,
            authMethod: SessionAuthMethod.ROBOT,
        });

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            session_id: session.id,
            user_agent: session.userAgent,
            remote_address: session.ipAddress,
            scope: ScopeName.GLOBAL,
            sub: input.id,
            sub_kind: OAuth2SubKind.ROBOT,
            realm_id: input.realm.id,
            realm_name: input.realm.name,
            client_id: input.clientId || undefined,
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
        });
    }
}
