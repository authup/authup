/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { BuiltInPolicyType } from '@authup/access';
import { Client as HTTPClient } from '@authup/core-http-kit';
import type { Client, Policy } from '@authup/core-kit';
import { EventName, IdentityType, ScopeName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import {
    OAuth2AuthorizationResponseType,
    OAuth2ErrorCode,
    OAuth2TokenGrant,
} from '@authup/specs';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import {
    createFakeClient,
    createFakeUser,
    expectClientError,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

// Application access policy (plan 052), /token backstop: a code minted BEFORE
// the policy was attached (or outside authorize()) must not redeem. The denial
// is invalid_grant — never access_denied at the token endpoint.
describe('grant-authorize (access policy backstop)', () => {
    const suite = createTestApplication();

    let denyPolicy: Policy;
    let allowPolicy: Policy;

    beforeAll(async () => {
        await suite.setup();

        denyPolicy = (await suite.client.policy.createBuiltIn({
            name: 'token-access-deny',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            types: [IdentityType.CLIENT],
            realmId: null,
        })).data;
        allowPolicy = (await suite.client.policy.createBuiltIn({
            name: 'token-access-allow',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            realmId: null,
        })).data;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const createClientWithScope = async (secret: string): Promise<Client> => {
        const { data: client } = await suite.client.client.create(createFakeClient({
            secret,
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
        }));
        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scopeId: scope.id,
            clientId: client.id,
        });
        return client;
    };

    const issueCode = async (clientId: string, actor: HTTPClient = suite.client): Promise<string> => {
        const response = await actor.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: clientId,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            state: generateOAuth2CodeVerifier(),
        });
        return new URL(response.url).searchParams.get('code')!;
    };

    it('should reject redemption of a code minted before a denying policy was attached', async () => {
        const secret = generateOAuth2CodeVerifier();
        const client = await createClientWithScope(secret);

        // the code is minted by a bearer session, so the refusal below can
        // name the session it was minted under
        const password = generateOAuth2CodeVerifier();
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const login = await suite.client.token.createWithPassword({ username: user.name, password });

        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const introspection = await bearer.token.introspect(
            { token: login.access_token },
            { authorizationHeaderInherit: true },
        );
        const sessionId = introspection.session_id as string;
        expect(sessionId).toBeDefined();

        const code = await issueCode(client.id, bearer);

        // attach the policy AFTER issuance — the /authorize gate never saw it
        await suite.client.client.update(client.id, { accessPolicyId: denyPolicy.id });

        await expectClientError(
            () => suite.client.token.createWithAuthorizationCode({
                client_id: client.id,
                client_secret: secret,
                redirect_uri: 'https://example.com/redirect',
                code,
            }),
            {
                status: 400,
                code: ErrorCode.OAUTH_GRANT_INVALID,
                data: { error: OAuth2ErrorCode.INVALID_GRANT },
            },
        );

        // the backstop leaves the row the interactive leg leaves (#3575).
        // AUTHORIZE_FAILED by name: the successful /authorize above already
        // recorded an AUTHORIZE row for this client.
        const { data: events } = await suite.client.event.getMany({ filters: { name: EventName.AUTHORIZE_FAILED, clientId: client.id } });
        expect(events).toHaveLength(1);
        expect(events[0].data).toEqual({
            reason: 'accessPolicy',
            grantType: OAuth2TokenGrant.AUTHORIZATION_CODE,
        });
        expect(events[0].sessionId).toEqual(sessionId);
    });

    it('should redeem a pre-policy code when the attached policy permits the subject', async () => {
        const secret = generateOAuth2CodeVerifier();
        const client = await createClientWithScope(secret);

        const code = await issueCode(client.id);

        await suite.client.client.update(client.id, { accessPolicyId: allowPolicy.id });

        const tokenResponse = await suite.client.token.createWithAuthorizationCode({
            client_id: client.id,
            client_secret: secret,
            redirect_uri: 'https://example.com/redirect',
            code,
        });

        expect(tokenResponse.access_token).toBeDefined();
    });
});
