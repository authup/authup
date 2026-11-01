/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, User } from '@authup/core-kit';
import { UserAuthenticatorKind } from '@authup/core-kit';
import { isOAuth2MfaRequiredError } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type {
    IOAuth2MfaLoginService,
    OAuth2MfaLoginTicketIssueInput,
} from '../../../../../src/core/oauth2/mfa-login/types.ts';
import { PasswordGrantType } from '../../../../../src/core/oauth2/grant-types/password.ts';
import { FakeAuthFlowMetrics } from '../../helpers/fake-auth-flow-metrics.ts';
import { FakeEventService } from '../../helpers/fake-event-service.ts';
import { FakeOAuth2TokenIssuer } from '../../helpers/fake-oauth2-token-issuer.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';
import { createConcurrentFirstFactor } from './concurrent-first-factor.ts';

describe('PasswordGrantType: a first factor stored concurrently with the login', () => {
    const realmId = randomUUID();
    const userId = randomUUID();
    const user = {
        id: userId,
        name: 'test-user',
        realmId,
    } as User;

    const client = { id: randomUUID() } as Client;

    let accessTokenIssuer: FakeOAuth2TokenIssuer;
    let sessionManager: FakeSessionManager;
    let eventService: FakeEventService;
    let metrics: FakeAuthFlowMetrics;
    let ticketCalls: OAuth2MfaLoginTicketIssueInput[];
    let mfaLoginService: IOAuth2MfaLoginService;

    beforeEach(() => {
        accessTokenIssuer = new FakeOAuth2TokenIssuer();
        sessionManager = new FakeSessionManager();
        eventService = new FakeEventService();
        metrics = new FakeAuthFlowMetrics();
        ticketCalls = [];
        mfaLoginService = {
            issueTicket: async (input) => {
                ticketCalls.push(input);

                return { token: 'mfa-ticket', expiresIn: 600 };
            },
            complete: async () => {
                throw new Error('not expected');
            },
        };
    });

    function build(enabled = true, kind: `${UserAuthenticatorKind}` = UserAuthenticatorKind.TOTP) {
        const factor = createConcurrentFirstFactor(sessionManager, {
            userId,
            realmId,
            enabled,
            kind,
        });
        const grant = new PasswordGrantType({
            accessTokenIssuer,
            refreshTokenIssuer: new FakeOAuth2TokenIssuer(),
            sessionManager,
            mfaChallengeProvider: factor.service,
            mfaLoginService,
            eventService,
            metrics,
        });

        return { grant, ...factor };
    }

    it('should revoke the session and require a second factor', async () => {
        const { grant, enrollAfterInsert } = build();

        enrollAfterInsert();

        const error = await grant.runWith({ user }).catch((e) => e);

        expect(isOAuth2MfaRequiredError(error)).toBe(true);
        expect(sessionManager.createCalls).toHaveLength(1);
        expect(sessionManager.revokeCalls).toHaveLength(1);
        expect(await sessionManager.findOneById(sessionManager.revokeCalls[0]!)).toBeNull();
        expect(accessTokenIssuer.issueCalls).toHaveLength(0);
    });

    it('should leave the session alone when mfa is disabled', async () => {
        const { grant, enrollAfterInsert } = build(false);

        enrollAfterInsert();

        const result = await grant.runWith({ user });

        expect(result).toHaveProperty('access_token');
        expect(sessionManager.revokeCalls).toHaveLength(0);
    });

    it('should not look up factors for a session carrying a second-factor proof', async () => {
        const {
            grant, 
            enrollAfterInsert, 
            lookups, 
        } = build();

        enrollAfterInsert();

        const result = await grant.runWith({ user, mfaVerifiedAt: new Date().toISOString() });

        expect(result).toHaveProperty('access_token');
        expect(lookups).not.toHaveBeenCalled();
        expect(sessionManager.revokeCalls).toHaveLength(0);
    });

    it('should issue tokens without loading factors when the user still holds none', async () => {
        const {
            grant, 
            lookups, 
            existenceChecks, 
        } = build();

        const result = await grant.runWith({ user });

        expect(result).toHaveProperty('access_token');
        expect(existenceChecks).toHaveBeenCalledTimes(1);
        expect(lookups).not.toHaveBeenCalled();
        expect(sessionManager.revokeCalls).toHaveLength(0);
    });

    it('should load the factors once when the user now holds one', async () => {
        const {
            grant, 
            lookups, 
            enrollAfterInsert, 
        } = build();

        enrollAfterInsert();

        await grant.runWith({ user }).catch((e) => e);

        expect(lookups).toHaveBeenCalledTimes(1);
    });

    it('should carry an mfa ticket when the factor needs an interactive challenge', async () => {
        const { grant, enrollAfterInsert } = build(true, UserAuthenticatorKind.EMAIL);

        enrollAfterInsert();

        const error = await grant.runWith({ user, client }, { ipAddress: '10.0.0.1' }).catch((e) => e);

        expect(isOAuth2MfaRequiredError(error)).toBe(true);
        expect(error.data).toMatchObject({
            kinds: [UserAuthenticatorKind.EMAIL],
            mfa_token: 'mfa-ticket',
            mfa_token_expires_in: 600,
        });
        expect(ticketCalls).toHaveLength(1);
        expect(ticketCalls[0]).toMatchObject({ user, clientId: client.id });
    });

    it('should carry no mfa ticket for a factor sent with the grant', async () => {
        const { grant, enrollAfterInsert } = build();

        enrollAfterInsert();

        const error = await grant.runWith({ user }).catch((e) => e);

        expect(isOAuth2MfaRequiredError(error)).toBe(true);
        expect(error.data).not.toHaveProperty('mfa_token');
        expect(ticketCalls).toHaveLength(0);
    });

    // The ordinary mfa_required answer records neither: the password was
    // right, so the login throttle must not count it.
    it('should record no failed login, like the ordinary mfa_required answer', async () => {
        const { grant, enrollAfterInsert } = build();

        enrollAfterInsert();

        const error = await grant.runWith({ user, client }, { ipAddress: '10.0.0.1', userAgent: 'agent' }).catch((e) => e);

        expect(isOAuth2MfaRequiredError(error)).toBe(true);
        expect(eventService.recordCalls).toHaveLength(0);
        expect(metrics.loginCalls).toEqual([]);
    });
});
