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
} from '@authup/core-kit';
import { OAuth2BaseGrant } from './base.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { OAuth2GrantRunWIthOptions } from './types.ts';

export class RobotCredentialsGrant extends OAuth2BaseGrant<Robot> {
    async runWith(input: Robot, options: OAuth2GrantRunWIthOptions = {}) : Promise<OAuth2TokenGrantResponse> {
        const session = await this.sessionManager.create({
            user_agent: options.userAgent,
            ip_address: options.ipAddress,
            realm_id: input.realm_id,
            sub: input.id,
            sub_kind: IdentityType.ROBOT,
        });

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            session_id: session.id,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            scope: ScopeName.GLOBAL,
            sub: input.id,
            sub_kind: OAuth2SubKind.ROBOT,
            realm_id: input.realm.id,
            realm_name: input.realm?.id,
            client_id: input.id,
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
        });
    }
}
