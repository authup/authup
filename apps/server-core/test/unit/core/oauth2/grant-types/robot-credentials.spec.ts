/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Realm, Robot } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { RobotCredentialsGrant } from '../../../../../src/core/oauth2/grant-types/robot-credentials.ts';
import { FakeOAuth2TokenIssuer } from '../../helpers/fake-oauth2-token-issuer.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

describe('RobotCredentialsGrant', () => {
    let accessTokenIssuer: FakeOAuth2TokenIssuer;
    let sessionManager: FakeSessionManager;
    let grant: RobotCredentialsGrant;

    const realmId = randomUUID();
    const robotId = randomUUID();
    const clientId = randomUUID();

    const robot = {
        id: robotId,
        realm_id: realmId,
        client_id: clientId,
        realm: {
            id: realmId,
            name: 'master',
        } as Realm,
    } as Robot;

    beforeEach(() => {
        accessTokenIssuer = new FakeOAuth2TokenIssuer();
        sessionManager = new FakeSessionManager();
        grant = new RobotCredentialsGrant({
            accessTokenIssuer,
            sessionManager,
        });
    });

    it('should issue access token with realm_name set to the realm name (not the realm id)', async () => {
        await grant.runWith(robot);

        expect(accessTokenIssuer.issueCalls).toHaveLength(1);
        const payload = accessTokenIssuer.issueCalls[0];

        expect(payload.realm_id).toEqual(realmId);
        expect(payload.realm_name).toEqual('master');
        expect(payload.realm_name).not.toEqual(realmId);
    });

    it('should issue access token with sub set to the robot id and client_id propagated', async () => {
        await grant.runWith(robot);

        const payload = accessTokenIssuer.issueCalls[0];

        expect(payload.sub).toEqual(robotId);
        expect(payload.sub_kind).toEqual(OAuth2SubKind.ROBOT);
        expect(payload.client_id).toEqual(clientId);
        expect(payload.scope).toEqual(ScopeName.GLOBAL);
    });

    it('should create a session bound to the robot', async () => {
        await grant.runWith(robot);

        expect(sessionManager.createCalls).toContainEqual(
            expect.objectContaining({
                realm_id: realmId,
                sub: robotId,
                sub_kind: IdentityType.ROBOT,
            }),
        );
    });
});
