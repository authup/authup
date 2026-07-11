/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind, OAuth2TokenGrant } from '@authup/specs';
import type { Client, User } from '@authup/core-kit';
import {
    AuditEventName,
    AuditEventRefType,
    AuditEventScope,
    IdentityType,
    ScopeName,
} from '@authup/core-kit';
import type { IAuditEventService } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { IOAuth2TokenIssuer } from '../token/index.ts';
import { OAuth2BaseGrant } from './base.ts';
import type { OAuth2GrantRunWIthOptions, OAuth2PasswordGrantContext } from './types.ts';

export type OAuth2PasswordGrantInput = {
    user: User,
    client?: Client,
};

export class PasswordGrantType extends OAuth2BaseGrant<OAuth2PasswordGrantInput> {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected auditEventService? : IAuditEventService;

    protected metrics? : IAuthFlowMetrics;

    constructor(ctx: OAuth2PasswordGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.auditEventService = ctx.auditEventService;
        this.metrics = ctx.metrics;
    }

    async runWith(input: OAuth2PasswordGrantInput, options: OAuth2GrantRunWIthOptions = {}) : Promise<OAuth2TokenGrantResponse> {
        const { user, client } = input;
        const clientId = client?.id;

        const session = await this.sessionManager.create({
            user_agent: options.userAgent,
            ip_address: options.ipAddress,
            realm_id: user.realm_id,
            client_id: clientId,
            sub: user.id,
            sub_kind: IdentityType.USER,
        });

        const issuePayload : Partial<OAuth2TokenPayload> = {
            client_id: clientId,
            session_id: session.id,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            scope: ScopeName.GLOBAL,
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
            realm_id: user.realm_id,
            realm_name: user.realm?.name,
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(issuePayload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(issuePayload);

        await this.auditEventService?.record({
            scope: AuditEventScope.OAUTH2,
            name: AuditEventName.LOGIN,
            refType: AuditEventRefType.SESSION,
            refId: session.id,
            clientId: clientId ?? null,
            actorType: IdentityType.USER,
            actorId: user.id,
            actorName: user.name,
            realmId: user.realm_id,
            requestIpAddress: options.ipAddress ?? null,
            requestUserAgent: options.userAgent ?? null,
            data: {
                grant_type: OAuth2TokenGrant.PASSWORD,
                session_id: session.id,
            },
        });
        this.metrics?.recordLogin('success');

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }
}
