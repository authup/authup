/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client as HTTPClient } from '@authup/core-http-kit';
import type { Client } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { SessionTokenEntity } from '../../../../../src/adapters/database/domains';
import { generateOAuth2CodeVerifier } from '../../../../../src/core';
import { createTestApplication } from '../../../../app';
import {
    createFakeClient,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils';

const REDIRECT_URI = 'https://example.com/redirect';

function decodeJwtPayload(token: string): Record<string, any> {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

describe('src/http/controllers/session-token', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createConfidentialClient(secret: string): Promise<Client> {
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
    }

    async function authorizeAndExchange(bearer: HTTPClient, client: Client, secret: string) {
        const authorizeResponse = await bearer.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: REDIRECT_URI,
            scope: `${ScopeName.GLOBAL}`,
            state: generateOAuth2CodeVerifier(),
        });
        const code = new URL(authorizeResponse.url).searchParams.get('code')!;

        return suite.client.token.createWithAuthorizationCode({
            client_id: client.id,
            client_secret: secret,
            redirect_uri: REDIRECT_URI,
            code,
        });
    }

    /**
     * One browser session serving two applications: a hosted credential login,
     * then two authorize round-trips riding the same bearer.
     */
    async function buildTwoAppSession() {
        const firstSecret = generateOAuth2CodeVerifier();
        const firstApp = await createConfidentialClient(firstSecret);
        const secondSecret = generateOAuth2CodeVerifier();
        const secondApp = await createConfidentialClient(secondSecret);

        const password = 'session-token-resource-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });

        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const sessionId = decodeJwtPayload(login.access_token).session_id!;
        const firstGrant = await authorizeAndExchange(bearer, firstApp, firstSecret);
        const secondGrant = await authorizeAndExchange(bearer, secondApp, secondSecret);

        return {
            user,
            bearer,
            sessionId,
            firstApp,
            firstSecret,
            secondApp,
            secondSecret,
            firstGrant,
            secondGrant,
        };
    }

    const admin = { Authorization: `Basic ${Buffer.from('admin:start123').toString('base64')}` };

    it('lists the tokens of a session, one row per application', async () => {
        const {
            sessionId, 
            firstApp, 
            secondApp, 
        } = await buildTwoAppSession();

        const response = await httpRequest(
            suite,
            'GET',
            `/session-tokens?filter[sessionId]=${sessionId}`,
            { headers: admin },
        );
        expect(response.status).toEqual(200);

        const body = await response.json();
        const clientIds = new Set(body.data.map((row: any) => row.clientId));

        // This is the back-channel logout audience (plan 064): the distinct
        // clients that got tokens off one session.
        expect(clientIds.has(firstApp.id)).toBe(true);
        expect(clientIds.has(secondApp.id)).toBe(true);
    });

    it('serves a client summary that include=client cannot widen', async () => {
        const { sessionId, firstApp } = await buildTwoAppSession();

        const response = await httpRequest(
            suite,
            'GET',
            `/session-tokens?filter[sessionId]=${sessionId}&include=client`,
            { headers: admin },
        );
        expect(response.status).toEqual(200);

        const body = await response.json();
        const row = body.data.find((entry: any) => entry.clientId === firstApp.id);

        expect(row.client).toBeDefined();
        expect(row.client.name).toEqual(firstApp.name);

        // Summary only (the consent-list shape): the full client row must
        // never ride a token read, whatever the reader includes.
        expect(row.client.redirectUri).toBeUndefined();
        expect(row.client.grantTypes).toBeUndefined();
        expect(row.client.secret).toBeUndefined();
        expect(row.client.accessPolicyId).toBeUndefined();
    });

    it('serves the client summary to a non-privileged reader', async () => {
        // The account console renders application names off this: a reader
        // without CLIENT_READ cannot include the client relation, so the
        // summary has to ride the row unconditionally.
        const {
            sessionId, 
            firstApp, 
            firstGrant, 
        } = await buildTwoAppSession();

        const response = await httpRequest(
            suite,
            'GET',
            `/session-tokens?filter[sessionId]=${sessionId}`,
            { headers: { Authorization: `Bearer ${firstGrant.access_token}` } },
        );
        expect(response.status).toEqual(200);

        const body = await response.json();
        const row = body.data.find((entry: any) => entry.clientId === firstApp.id);

        expect(row.client).toBeDefined();
        expect(row.client.name).toEqual(firstApp.name);
        expect(row.client.redirectUri).toBeUndefined();
        expect(row.client.secret).toBeUndefined();
    });

    it('finds every session an application served', async () => {
        const { sessionId, secondApp } = await buildTwoAppSession();

        // The capability `filter[clientId]` on /sessions cannot provide: the
        // session column names only the FIRST authorizer, so the second
        // application is invisible to it.
        const response = await httpRequest(
            suite,
            'GET',
            `/session-tokens?filter[clientId]=${secondApp.id}`,
            { headers: admin },
        );
        expect(response.status).toEqual(200);

        const body = await response.json();
        expect(body.data.map((row: any) => row.sessionId)).toContain(sessionId);
    });

    it('revokes one application and leaves the session and the other application alive', async () => {
        const {
            sessionId,
            firstApp,
            firstSecret,
            secondApp,
            secondSecret,
            firstGrant,
            secondGrant,
        } = await buildTwoAppSession();

        const response = await httpRequest(
            suite,
            'DELETE',
            `/session-tokens?filter[sessionId]=${sessionId}&filter[clientId]=${secondApp.id}`,
            { headers: admin },
        );
        expect(response.status).toEqual(202);
        expect((await response.json()).count).toBeGreaterThanOrEqual(1);

        const rows = await suite.dataSource
            .getRepository(SessionTokenEntity)
            .find({ where: { sessionId } });

        for (const row of rows) {
            if (row.clientId === secondApp.id) {
                expect(row.revokedAt).not.toBeNull();
            } else {
                expect(row.revokedAt).toBeNull();
            }
        }

        // The session itself survives, which is the whole point: revoking one
        // application must not sign the user out of the others.
        const session = await suite.client.session.getOne(sessionId);
        expect(session.data.id).toEqual(sessionId);

        // The untouched application can still refresh: the session and its
        // rows are intact.
        const refreshed = await suite.client.token.createWithRefreshToken({
            refresh_token: firstGrant.refresh_token!,
            client_id: firstApp.id,
            client_secret: firstSecret,
        });
        expect(typeof refreshed.access_token).toEqual('string');

        // The revoked one cannot. The row is the authority for refresh
        // validity (plan 016), so a stamped row rejects the grant.
        await expectClientError(
            () => suite.client.token.createWithRefreshToken({
                refresh_token: secondGrant.refresh_token!,
                client_id: secondApp.id,
                client_secret: secondSecret,
            }),
            { status: 400 },
        );
    });

    it('scopes a non-privileged reader to its own sessions tokens', async () => {
        // The self-service path, and the one that fails OPEN if the injected
        // ownership condition does not resolve: an unscoped read would hand
        // every user's token inventory to anyone who asks.
        const password = 'session-token-self-service-password';
        const { data: mine } = await suite.client.user.create(createFakeUser({ password }));
        const { data: other } = await suite.client.user.create(createFakeUser({ password }));

        const myLogin = await suite.client.token.createWithPassword({ username: mine.name, password });
        const otherLogin = await suite.client.token.createWithPassword({ username: other.name, password });

        const mySessionId = decodeJwtPayload(myLogin.access_token).session_id!;
        const otherSessionId = decodeJwtPayload(otherLogin.access_token).session_id!;
        expect(mySessionId).not.toEqual(otherSessionId);

        const response = await httpRequest(suite, 'GET', '/session-tokens', { headers: { Authorization: `Bearer ${myLogin.access_token}` } });
        expect(response.status).toEqual(200);

        const body = await response.json();
        const sessionIds = body.data.map((row: any) => row.sessionId);

        expect(sessionIds).toContain(mySessionId);
        expect(sessionIds).not.toContain(otherSessionId);
        expect(new Set(sessionIds)).toEqual(new Set([mySessionId]));
    });

    it('refuses a non-privileged bulk revoke of another subject tokens', async () => {
        const password = 'session-token-cross-subject-password';
        const { data: mine } = await suite.client.user.create(createFakeUser({ password }));
        const { data: other } = await suite.client.user.create(createFakeUser({ password }));

        const myLogin = await suite.client.token.createWithPassword({ username: mine.name, password });
        const otherLogin = await suite.client.token.createWithPassword({ username: other.name, password });
        const otherSessionId = decodeJwtPayload(otherLogin.access_token).session_id!;

        const response = await httpRequest(
            suite,
            'DELETE',
            `/session-tokens?filter[sessionId]=${otherSessionId}`,
            { headers: { Authorization: `Bearer ${myLogin.access_token}` } },
        );

        // Either refused outright or a no-op, but never a revoke: the other
        // subject's rows must survive untouched.
        if (response.status < 400) {
            expect((await response.json()).count).toEqual(0);
        }

        const rows = await suite.dataSource
            .getRepository(SessionTokenEntity)
            .find({ where: { sessionId: otherSessionId } });
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row.revokedAt).toBeNull();
        }
    });

    it.each(['session', 'client', 'session,client'])('survives include=%s', async (include) => {
        // The repository joins `session` unconditionally for the gate. If
        // rapiq auto-joins the same relation under a different alias for an
        // explicit include, the second join would collide.
        const { sessionId } = await buildTwoAppSession();

        const response = await httpRequest(
            suite,
            'GET',
            `/session-tokens?filter[sessionId]=${sessionId}&include=${include}`,
            { headers: admin },
        );

        expect(response.status).toEqual(200);
        const body = await response.json();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('revokes across several sessions through the typed client', async () => {
        // The exact call the account console makes: an ARRAY of session ids
        // plus a client id. If the array did not serialize as a comma list the
        // scope would silently change shape.
        const first = await buildTwoAppSession();
        const second = await buildTwoAppSession();

        const result = await suite.client.sessionToken.deleteMany({
            filters: {
                sessionId: [first.sessionId, second.sessionId],
                clientId: first.secondApp.id,
            },
        });

        expect(result.count).toBeGreaterThan(0);

        const revoked = await suite.dataSource
            .getRepository(SessionTokenEntity)
            .find({ where: { sessionId: first.sessionId } });

        for (const row of revoked) {
            if (row.clientId === first.secondApp.id) {
                expect(row.revokedAt).not.toBeNull();
            } else {
                expect(row.revokedAt).toBeNull();
            }
        }
    });

    it('rejects a bulk revoke that carries no target filter', async () => {
        // No self-service fallback here, unlike DELETE /sessions, so an
        // unscoped call must fail loudly rather than revoke everything.
        const response = await httpRequest(suite, 'DELETE', '/session-tokens', { headers: admin });

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
    });

    it.each([
        // bracket dialect
        ['a negation', 'filter[id]=!00000000-0000-4000-8000-000000000000'],
        ['a suffix match', 'filter[id]=~0'],
        // expression dialect: rapiq collapses not(eq(..)) into an `ne` leaf,
        // but a negated CONJUNCTION stays a compound node, and `or` has no
        // bracket spelling at all. Both name a target key without bounding
        // the result set.
        [
            'a negated conjunction',
            "codec=url-expression&filter=not(and(eq(id,'a'),eq(clientId,'b')))",
        ],
        [
            'a disjunction with an unscoped branch',
            "codec=url-expression&filter=or(eq(id,'a'),eq(kind,'access'))",
        ],
    ])('refuses a bulk revoke scoped only by %s', async (_label, query) => {
        // A target KEY is not a target SCOPE.
        const { sessionId } = await buildTwoAppSession();

        const response = await httpRequest(suite, 'DELETE', `/session-tokens?${query}`, { headers: admin });
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);

        const rows = await suite.dataSource
            .getRepository(SessionTokenEntity)
            .find({ where: { sessionId } });
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row.revokedAt).toBeNull();
        }
    });

    it('still accepts a disjunction whose every branch is scoped', async () => {
        // The rule is "bounded", not "no or": an or of scoped branches is
        // still bounded, and rejecting it would be a false positive.
        const first = await buildTwoAppSession();
        const second = await buildTwoAppSession();

        const query = `codec=url-expression&filter=or(eq(sessionId,'${first.sessionId}'),eq(sessionId,'${second.sessionId}'))`;
        const response = await httpRequest(suite, 'DELETE', `/session-tokens?${query}`, { headers: admin });

        expect(response.status).toEqual(202);
        expect((await response.json()).count).toBeGreaterThan(0);
    });

    it('filters through the session relation without listing dotted keys', async () => {
        // rapiq resolves a dotted key against the RELATION's own registered
        // schema via `schemaMapping`, so `session.realmId` is allow-listed by
        // the session schema rather than repeated here. Listing it locally is
        // not even expressible: every `allowed` list is typed as simple keys
        // or relation names.
        const { sessionId } = await buildTwoAppSession();
        const { data: session } = await suite.client.session.getOne(sessionId);

        // Paired with the session id so the assertion cannot depend on how
        // many other rows the suite has produced, and asserted in BOTH
        // directions so it proves the dotted key constrains the query rather
        // than merely being accepted and ignored.
        const matching = await httpRequest(
            suite,
            'GET',
            `/session-tokens?filter[sessionId]=${sessionId}&filter[session.realmId]=${session.realmId}`,
            { headers: admin },
        );
        expect(matching.status).toEqual(200);
        expect((await matching.json()).data.length).toBeGreaterThan(0);

        const foreignRealm = '00000000-0000-4000-8000-00000000beef';
        const excluded = await httpRequest(
            suite,
            'GET',
            `/session-tokens?filter[sessionId]=${sessionId}&filter[session.realmId]=${foreignRealm}`,
            { headers: admin },
        );
        expect(excluded.status).toEqual(200);
        expect((await excluded.json()).data).toHaveLength(0);
    });

    it('revokes a single token by its jti', async () => {
        const { secondGrant } = await buildTwoAppSession();
        const { jti } = decodeJwtPayload(secondGrant.access_token);

        const response = await httpRequest(suite, 'DELETE', `/session-tokens/${jti}`, { headers: admin });
        expect(response.status).toEqual(202);

        // The response body must reflect the revoke it just performed, not the
        // row as it was read a moment earlier.
        expect((await response.json()).data.revokedAt).not.toBeNull();

        const row = await suite.dataSource
            .getRepository(SessionTokenEntity)
            .findOne({ where: { id: jti } });
        expect(row!.revokedAt).not.toBeNull();
    });
});
