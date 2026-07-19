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
import type { Client, Policy } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2AuthorizationResponseType, OAuth2ErrorCode } from '@authup/specs';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { createFakeClient, expectClientError } from '../../../../../utils';
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

        denyPolicy = await suite.client.policy.createBuiltIn({
            name: 'token-access-deny',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            types: [IdentityType.CLIENT],
            realmId: null,
        });
        allowPolicy = await suite.client.policy.createBuiltIn({
            name: 'token-access-allow',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            realmId: null,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const createClientWithScope = async (secret: string): Promise<Client> => {
        const client = await suite.client.client.create(createFakeClient({
            secret,
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
        }));
        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scopeId: scope.id,
            clientId: client.id,
        });
        return client;
    };

    const issueCode = async (clientId: string): Promise<string> => {
        const response = await suite.client.authorize.confirm({
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

        const code = await issueCode(client.id);

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
