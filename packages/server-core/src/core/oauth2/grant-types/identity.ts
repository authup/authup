/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { Identity, Session } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import type { ISessionRepository } from '../../authentication';
import type { IOAuth2TokenIssuer } from '../token';
import { BaseGrant } from './base';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { OAuth2GrantRunWIthOptions, OAuth2IdentityGrantContext } from './types';

export class IdentityGrantType extends BaseGrant<Identity> {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected sessionRepository : ISessionRepository;

    constructor(ctx: OAuth2IdentityGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
    }

    async runWith(
        identity: Identity,
        options: OAuth2GrantRunWIthOptions = {},
    ): Promise<OAuth2TokenGrantResponse> {
        const session : Partial<Session> = {
            user_agent: options.userAgent,
            ip_address: options.ipAddress,
            realm_id: identity.data.realm_id,
        };

        switch (identity.type) {
            case IdentityType.CLIENT: {
                session.client_id = identity.data.id;
                break;
            }
            case IdentityType.USER: {
                session.user_id = identity.data.id;
                session.client_id = identity.data.client_id;
                break;
            }

            case IdentityType.ROBOT: {
                session.robot_id = identity.data.id;
                session.client_id = identity.data.client_id;
                break;
            }
        }
        const { id: sessionId } = await this.sessionRepository.save(session);

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            session_id: sessionId,
            remote_address: options.ipAddress,
            scope: ScopeName.GLOBAL,
            realm_id: identity.data.realm_id,
            realm_name: identity.data.realm?.name,
            sub: identity.data.id,
            sub_kind: identity.type,
        });

        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(accessTokenPayload);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }
}
