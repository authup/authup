/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { User } from '@authup/core-kit';
import { isOAuth2MfaRequiredError } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { PasswordGrantType } from '../../../../../src/core/oauth2/grant-types/password.ts';
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

    let accessTokenIssuer: FakeOAuth2TokenIssuer;
    let sessionManager: FakeSessionManager;

    beforeEach(() => {
        accessTokenIssuer = new FakeOAuth2TokenIssuer();
        sessionManager = new FakeSessionManager();
    });

    function build(enabled = true) {
        const factor = createConcurrentFirstFactor(sessionManager, {
            userId, 
            realmId, 
            enabled, 
        });
        const grant = new PasswordGrantType({
            accessTokenIssuer,
            refreshTokenIssuer: new FakeOAuth2TokenIssuer(),
            sessionManager,
            mfaChallengeProvider: factor.service,
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

    it('should issue tokens when the user still holds no factor', async () => {
        const { grant, lookups } = build();

        const result = await grant.runWith({ user });

        expect(result).toHaveProperty('access_token');
        expect(lookups).toHaveBeenCalledTimes(1);
        expect(sessionManager.revokeCalls).toHaveLength(0);
    });
});
