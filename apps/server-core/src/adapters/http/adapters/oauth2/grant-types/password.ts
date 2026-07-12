/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { EventName, EventScope } from '@authup/core-kit';
import { isEntityCredentialsInvalidError, isEntityInactiveError } from '@authup/errors';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2MfaRequiredError, OAuth2RequestError, OAuth2TokenGrant } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type {
    ICredentialsAuthenticator,
    ILoginThrottleService,
    IRealmRepository,
    IUserAuthenticatorService,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import {
    PasswordGrantType,
    assertClientGrantAllowed,
    guessUserAuthenticatorKindByResponse,
} from '../../../../../core/index.ts';
import type { HTTPOAuth2PasswordGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest, readRealmHint, readStringField } from './utils/index.ts';

export class HTTPPasswordGrant extends PasswordGrantType implements IHTTPOAuth2Grant {
    protected authenticator : ICredentialsAuthenticator<User>;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected realmRepository : IRealmRepository;

    protected loginThrottleService? : ILoginThrottleService;

    protected userAuthenticatorService? : IUserAuthenticatorService;

    constructor(ctx: HTTPOAuth2PasswordGrantContext) {
        super(ctx);

        this.authenticator = ctx.authenticator;
        this.clientAuthenticator = ctx.clientAuthenticator;
        this.realmRepository = ctx.realmRepository;
        this.loginThrottleService = ctx.loginThrottleService;
        this.userAuthenticatorService = ctx.userAuthenticatorService;
    }

    async runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);

        const username = readStringField(body, 'username');
        const password = readStringField(body, 'password');
        if (!username || !password) {
            throw OAuth2RequestError.malformed('username and password must be provided.');
        }

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);

        const realm = await this.realmRepository.resolve(readRealmHint(body), true);

        const client = clientId ?
            await this.clientAuthenticator.authenticate(
                clientId,
                clientSecret,
                realm.id,
            ) :
            undefined;

        if (client) {
            assertClientGrantAllowed(client, OAuth2TokenGrant.PASSWORD);
        }

        const ipAddress = getRequestIP(event, { trustProxy: true }) ?? undefined;
        const userAgent = getRequestHeader(event, 'user-agent') ?? undefined;

        // canonical identifier form (layer 3) — the throttle key and the
        // loginFailed actor_name must match what canonically stored rows carry.
        const identifier = username.trim().toLowerCase();

        await this.loginThrottleService?.assertNotThrottled({
            identifier,
            ipAddress,
            realmId: realm.id,
        });

        let user : User;
        try {
            user = await this.authenticator.authenticate(username, password, realm.id);
        } catch (e) {
            if (isEntityCredentialsInvalidError(e) || isEntityInactiveError(e)) {
                await this.eventService?.record({
                    scope: EventScope.OAUTH2,
                    name: EventName.LOGIN_FAILED,
                    actorType: null,
                    actorId: null,
                    actorName: identifier,
                    clientId: client?.id ?? null,
                    realmId: realm.id,
                    requestIpAddress: ipAddress ?? null,
                    requestUserAgent: userAgent ?? null,
                    requestPath: event.path,
                    requestMethod: event.method,
                    data: { error_code: e.code },
                });
                this.metrics?.recordLogin('failure');
            }

            throw e;
        }

        const mfaVerifiedAt = await this.verifySecondFactor(user, body, {
            ipAddress,
            userAgent,
            clientId: client?.id ?? null,
        });

        return this.runWith(
            {
                user, 
                client, 
                mfaVerifiedAt, 
            },
            {
                ipAddress,
                userAgent,
            },
        );
    }

    /**
     * MFA gate on the direct password grant: a user holding a confirmed
     * device must send a valid `otp` form parameter (TOTP or recovery
     * code, classified by shape) — otherwise `mfa_required`. Users
     * without a device pass through (they could never enroll otherwise).
     */
    protected async verifySecondFactor(
        user: User,
        body: Record<string, any>,
        ctx: {
            ipAddress?: string, 
            userAgent?: string, 
            clientId: string | null 
        },
    ): Promise<string | undefined> {
        if (!this.userAuthenticatorService) {
            return undefined;
        }

        const status = await this.userAuthenticatorService.challenge(user.id);
        if (!status.required) {
            return undefined;
        }

        const otp = readStringField(body, 'otp');
        if (!otp) {
            throw OAuth2MfaRequiredError.challengeRequired();
        }

        const verified = await this.userAuthenticatorService.verify(
            user.id,
            {
                kind: guessUserAuthenticatorKindByResponse(otp),
                response: otp,
            },
            {
                ipAddress: ctx.ipAddress ?? null,
                userAgent: ctx.userAgent ?? null,
                clientId: ctx.clientId,
            },
        );
        if (!verified) {
            throw new OAuth2MfaRequiredError({ message: 'The provided second factor is not valid.' });
        }

        return new Date().toISOString();
    }
}
