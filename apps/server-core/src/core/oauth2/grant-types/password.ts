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
    EventName,
    EventRefType,
    EventScope,
    IdentityType,
    ScopeName,
    SessionAuthMethod,
} from '@authup/core-kit';
import type { IEventService } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import { deriveAmrAcr } from '../authorization/helpers.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { IOAuth2TokenIssuer } from '../token/index.ts';
import { OAuth2BaseGrant } from './base.ts';
import type { OAuth2GrantRunWIthOptions, OAuth2PasswordGrantContext } from './types.ts';

export type OAuth2PasswordGrantInput = {
    user: User,
    client?: Client,
    /**
     * Instant the user passed a second-factor challenge alongside the
     * grant (the `otp` parameter) — stamped onto the session as mfaAt.
     */
    mfaVerifiedAt?: string,
};

export class PasswordGrantType extends OAuth2BaseGrant<OAuth2PasswordGrantInput> {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    constructor(ctx: OAuth2PasswordGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.eventService = ctx.eventService;
        this.metrics = ctx.metrics;
    }

    async runWith(input: OAuth2PasswordGrantInput, options: OAuth2GrantRunWIthOptions = {}) : Promise<OAuth2TokenGrantResponse> {
        const { user, client } = input;
        const clientId = client?.id;

        const session = await this.sessionManager.create({
            userAgent: options.userAgent,
            ipAddress: options.ipAddress,
            realmId: user.realmId,
            // no `clientId`: this is a USER-subject session, and the column is
            // the client-SUBJECT foreign key. The authenticating application is
            // recorded on the token rows instead.
            sub: user.id,
            subKind: IdentityType.USER,
            mfaAt: input.mfaVerifiedAt ?? null,
            authMethod: SessionAuthMethod.PASSWORD,
        });

        // amr/acr derive from the session's authMethod + mfaAt — deliberately
        // on every token kind, so a direct password grant's tokens advertise the
        // method the same way the authorization_code exchange does.
        const amrAcr = deriveAmrAcr(session);

        const issuePayload : Partial<OAuth2TokenPayload> = {
            client_id: clientId,
            session_id: session.id,
            user_agent: session.userAgent,
            remote_address: session.ipAddress,
            scope: ScopeName.GLOBAL,
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
            realm_id: user.realmId,
            realm_name: user.realm?.name,
            ...(options.confirmation ? { cnf: options.confirmation } : {}),
            ...amrAcr,
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(issuePayload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(issuePayload);

        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            refType: EventRefType.SESSION,
            refId: session.id,
            clientId: clientId ?? null,
            sessionId: session.id,
            actorType: IdentityType.USER,
            actorId: user.id,
            actorName: user.name,
            realmId: user.realmId,
            requestIpAddress: options.ipAddress ?? null,
            requestUserAgent: options.userAgent ?? null,
            data: { grantType: OAuth2TokenGrant.PASSWORD },
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
