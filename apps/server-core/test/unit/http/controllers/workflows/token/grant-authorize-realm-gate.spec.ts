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
    it,
} from 'vitest';
import type { Client, Identity, Realm } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2AuthorizationCodeChallengeMethod, OAuth2AuthorizationResponseType } from '@authup/specs';
import type { IOAuth2AuthorizationCodeIssuer } from '../../../../../../src/core';
import { buildOAuth2CodeChallenge, generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { OAuth2InjectionToken } from '../../../../../../src/app/modules/oauth2/constants';
import {
    createFakeRealm,
    createFakeUser,
    expectClientError,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const REDIRECT_URI = 'https://app.example.com/cb';

// Layer 2 of the authorize realm gate (plan 041): the /token code verifier
// rejects a code whose realm_id differs from the redeeming client's realm.
// Layer 1 (POST /authorize issuance) now blocks minting such a code through the
// public API, so this pins the defense-in-depth backstop by minting a
// cross-realm code directly via the DI code issuer (the shape an
// identity-provider callback or a pre-deploy in-flight code could carry).
describe('grant-authorize realm gate (layer 2)', () => {
    const suite = createTestApplication();

    let realmA : Realm;
    let realmB : Realm;
    let clientB : Client;
    let codeIssuer : IOAuth2AuthorizationCodeIssuer;

    beforeAll(async () => {
        await suite.setup();

        realmA = await suite.client.realm.create(createFakeRealm());
        realmB = await suite.client.realm.create(createFakeRealm());

        // a public (PKCE) client living in realm B
        clientB = await suite.client.client.create({
            realm_id: realmB.id,
            name: `app-${generateOAuth2CodeVerifier().slice(0, 10).toLowerCase()}`,
            is_confidential: false,
            secret: null,
            redirect_uri: `${REDIRECT_URI.replace('/cb', '')}/**`,
        });

        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({ scope_id: scope.id, client_id: clientB.id });

        codeIssuer = suite.container.resolve(OAuth2InjectionToken.AuthorizationCodeIssuer);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('rejects a code bound to another realm at /token with invalid_grant', async () => {
        // a real realm-A user gives the code a genuine sub/realm
        const user = await suite.client.user.create(createFakeUser({ realm_id: realmA.id }));

        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        // mint a code for realm-B's client, but authorized by a realm-A identity
        // (realm_id is taken from the identity → realm A)
        const identity: Identity = {
            type: IdentityType.USER,
            data: {
                ...user,
                realm: realmA,
            },
        };

        const code = await codeIssuer.issue(
            {
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: clientB.id,
                redirect_uri: REDIRECT_URI,
                scope: ScopeName.GLOBAL,
                code_challenge: codeChallenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            },
            identity,
        );

        // redeeming against realm-B's client → the verifier sees
        // code.realm_id (A) !== client.realm_id (B) → invalid_grant
        await expectClientError(
            () => suite.client.token.createWithAuthorizationCode({
                client_id: clientB.id,
                redirect_uri: REDIRECT_URI,
                code: code.id,
                code_verifier: codeVerifier,
            }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );
    });

    it('accepts a realm-consistent code at /token', async () => {
        // control: the same shape, but the identity's realm matches the client's
        const user = await suite.client.user.create(createFakeUser({ realm_id: realmB.id }));

        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        const identity: Identity = {
            type: IdentityType.USER,
            data: {
                ...user,
                realm: realmB,
            },
        };

        const code = await codeIssuer.issue(
            {
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: clientB.id,
                redirect_uri: REDIRECT_URI,
                scope: ScopeName.GLOBAL,
                code_challenge: codeChallenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            },
            identity,
        );

        const tokenResponse = await suite.client.token.createWithAuthorizationCode({
            client_id: clientB.id,
            redirect_uri: REDIRECT_URI,
            code: code.id,
            code_verifier: codeVerifier,
        });

        if (!tokenResponse.access_token) {
            throw new Error('expected an access token for a realm-consistent code');
        }
    });
});
