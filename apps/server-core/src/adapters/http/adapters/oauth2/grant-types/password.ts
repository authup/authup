/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { EventName, EventScope, UserAuthenticatorKind } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import { isEntityCredentialsInvalidError, isEntityInactiveError } from '@authup/errors';
import type { OAuth2TokenConfirmation, OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2MfaRequiredError, OAuth2RequestError, OAuth2TokenGrant } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type {
    ICredentialsAuthenticator,
    ILoginThrottleService,
    IOAuth2MfaLoginService,
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
import type { CertificateSource } from '../../../request/index.ts';
import {
    extractClientCredentialsFromRequest,
    extractOAuth2ClientCertificateEvidence,
    readRealmHint,
    readStringField,
} from './utils/index.ts';

export class HTTPPasswordGrant extends PasswordGrantType implements IHTTPOAuth2Grant {
    protected authenticator : ICredentialsAuthenticator<User>;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected realmRepository : IRealmRepository;

    protected loginThrottleService? : ILoginThrottleService;

    protected userAuthenticatorService? : IUserAuthenticatorService;

    protected mfaLoginService? : IOAuth2MfaLoginService;

    protected logger? : Logger;

    protected certificateSource: CertificateSource;

    constructor(ctx: HTTPOAuth2PasswordGrantContext) {
        super(ctx);

        this.authenticator = ctx.authenticator;
        this.clientAuthenticator = ctx.clientAuthenticator;
        this.realmRepository = ctx.realmRepository;
        this.loginThrottleService = ctx.loginThrottleService;
        this.userAuthenticatorService = ctx.userAuthenticatorService;
        this.mfaLoginService = ctx.mfaLoginService;
        this.logger = ctx.logger;
        this.certificateSource = ctx.certificateSource ?? 'disabled';
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
        const certificateEvidence = extractOAuth2ClientCertificateEvidence(event, this.certificateSource);

        const client = clientId ?
            await this.clientAuthenticator.authenticate(
                clientId,
                clientSecret,
                realm.id,
                certificateEvidence,
            ) :
            undefined;

        const confirmation = client ?
            this.clientAuthenticator.resolveTokenBinding(client, certificateEvidence) :
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
            confirmation,
        });

        return this.runWith(
            {
                user, 
                client, 
                mfaVerifiedAt, 
            },
            {
                confirmation,
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
            clientId: string | null,
            confirmation?: OAuth2TokenConfirmation,
        },
    ): Promise<string | undefined> {
        if (!this.userAuthenticatorService) {
            return undefined;
        }

        // requirement flags + kinds only — no webauthn material on the token path.
        const status = await this.userAuthenticatorService.challenge(user.id, { issueMaterial: false });
        if (!status.required) {
            return undefined;
        }

        const otp = readStringField(body, 'otp');
        if (!otp) {
            // carry the challengeable kinds so a client (the hosted login form)
            // can tell whether a single-POST factor (totp/recovery) is on offer
            // or the user must complete an interactive challenge (email/webauthn).
            // For the interactive kinds an "MFA-pending" ticket (issue #3242)
            // rides along: a restricted mfa_token-kind bearer accepted ONLY by
            // the challenge routes, backed by a short-lived pending session
            // (mfa_at: null) — never a usable access/refresh pair.
            const ticket = await this.issueMfaTicket(user, status.kinds, ctx);

            throw new OAuth2MfaRequiredError({
                message: 'Complete a second-factor challenge to continue.',
                data: {
                    kinds: status.kinds,
                    ...(ticket ? {
                        mfa_token: ticket.token,
                        mfa_token_expires_in: ticket.expiresIn,
                    } : {}),
                },
            });
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
            throw new OAuth2MfaRequiredError({
                message: 'The provided second factor is not valid.',
                data: { kinds: status.kinds },
            });
        }

        return new Date().toISOString();
    }

    /**
     * Issue the MFA-pending ticket for factor kinds that cannot complete
     * inside the single grant POST (email needs a server-sent code,
     * WebAuthn an interactive ceremony). TOTP/recovery-only users keep
     * the inline `otp` fast-path and get no ticket — a pending session
     * per plain code entry would be pure churn.
     */
    protected async issueMfaTicket(
        user: User,
        kinds: `${UserAuthenticatorKind}`[],
        ctx: {
            ipAddress?: string,
            userAgent?: string,
            clientId: string | null,
            confirmation?: OAuth2TokenConfirmation,
        },
    ) : Promise<{ token: string, expiresIn: number } | null> {
        if (!this.mfaLoginService) {
            return null;
        }

        const interactive = kinds.includes(UserAuthenticatorKind.EMAIL) ||
            kinds.includes(UserAuthenticatorKind.WEBAUTHN);
        if (!interactive) {
            return null;
        }

        try {
            return await this.mfaLoginService.issueTicket(
                {
                    user,
                    clientId: ctx.clientId,
                    confirmation: ctx.confirmation,
                },
                {
                    ipAddress: ctx.ipAddress,
                    userAgent: ctx.userAgent,
                },
            );
        } catch (e) {
            // degrade to a ticket-less mfa_required rather than letting a
            // transient issuance failure (pending-session write, cache,
            // signer) escape as a raw 500 from a controlled response path —
            // an otp-capable device can still complete, and the credential
            // retry re-attempts the ticket.
            this.logger?.warn('Issuing the MFA-pending login ticket failed.', { error: e });

            return null;
        }
    }
}
