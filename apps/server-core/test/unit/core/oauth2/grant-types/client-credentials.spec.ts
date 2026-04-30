/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, Realm } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ClientCredentialsGrant } from '../../../../../src/core/oauth2/grant-types/client-credentials.ts';
import { FakeOAuth2TokenIssuer } from '../../helpers/fake-oauth2-token-issuer.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

describe('ClientCredentialsGrant', () => {
    let accessTokenIssuer: FakeOAuth2TokenIssuer;
    let sessionManager: FakeSessionManager;
    let grant: ClientCredentialsGrant;

    const realmId = randomUUID();
    const clientId = randomUUID();

    const client = {
        id: clientId,
        realm_id: realmId,
        realm: {
            id: realmId,
            name: 'master',
        } as Realm,
    } as Client;

    beforeEach(() => {
        accessTokenIssuer = new FakeOAuth2TokenIssuer();
        sessionManager = new FakeSessionManager();
        grant = new ClientCredentialsGrant({
            accessTokenIssuer,
            sessionManager,
        });
    });

    it('should issue access token with realm_name set to the realm name (not the realm id)', async () => {
        await grant.runWith(client);

        expect(accessTokenIssuer.issueCalls).toHaveLength(1);
        const payload = accessTokenIssuer.issueCalls[0];

        expect(payload.realm_id).toEqual(realmId);
        expect(payload.realm_name).toEqual('master');
        expect(payload.realm_name).not.toEqual(realmId);
    });

    it('should issue access token with client_id and sub set to the client id', async () => {
        await grant.runWith(client);

        const payload = accessTokenIssuer.issueCalls[0];

        expect(payload.sub).toEqual(clientId);
        expect(payload.sub_kind).toEqual(OAuth2SubKind.CLIENT);
        expect(payload.client_id).toEqual(clientId);
        expect(payload.scope).toEqual(ScopeName.GLOBAL);
    });

    it('should create a session bound to the client', async () => {
        await grant.runWith(client);

        expect(sessionManager.createCalls).toContainEqual(
            expect.objectContaining({
                realm_id: realmId,
                sub: clientId,
                sub_kind: IdentityType.CLIENT,
            }),
        );
    });
});
