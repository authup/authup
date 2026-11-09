/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType } from '@authup/access';
import type { Client, Key, Realm } from '@authup/core-kit';
import {
    ClientTokenExchangeRealmScope,
    EventName,
    EventRefType,
    EventScope,
    IdentityType,
} from '@authup/core-kit';
import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import {
    JWKType,
    OAuth2ErrorCode,
    OAuth2SubKind,
    OAuth2TokenGrant,
    OAuth2TokenKind,
    OAuth2TokenTypeIdentifier,
} from '@authup/specs';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { MetricsInjectionKey } from '../../../../../../src/app/modules/metrics/index.ts';
import { OAuth2InjectionToken } from '../../../../../../src/app/modules/oauth2/constants';
import { createTestApplication } from '../../../../../app';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    httpRequest,
} from '../../../../../utils';

const CAP = 'bucket:b-1:read,write';
const AUDIENCE = 'storage';

type Form = Record<string, string>;

describe('token endpoint: token exchange (RFC 8693)', () => {
    const suite = createTestApplication();

    let actor: Client;
    let userToken: OAuth2TokenGrantResponse;
    let username: string;
    let password: string;

    const createActor = async (overrides: Partial<Client> = {}) : Promise<Client> => {
        const { data } = await suite.client.client.create(createFakeClient({
            active: true,
            secretHashed: false,
            secretEncrypted: false,
            grantTypes: OAuth2TokenGrant.TOKEN_EXCHANGE,
            ...overrides,
        }));

        return data;
    };

    const createCapability = async (clientId: string, overrides: Record<string, unknown> = {}) => {
        await suite.client.clientTokenExchangeCapability.create({
            clientId,
            audience: AUDIENCE,
            value: 'bucket bucket-file',
            maxAge: 3600,
            ...overrides,
        });
    };

    const buildForm = (client: Client, overrides: Form = {}, subject: string = userToken.access_token) : Form => ({
        grant_type: OAuth2TokenGrant.TOKEN_EXCHANGE,
        client_id: client.id,
        client_secret: client.secret!,
        subject_token: subject,
        subject_token_type: OAuth2TokenTypeIdentifier.ACCESS_TOKEN,
        audience: AUDIENCE,
        cap: CAP,
        ...overrides,
    });

    const exchange = (form: Form, path = '/token') => httpRequest(suite, 'POST', path, { form });

    const expectRefused = async (response: Response, status: number, error: string) => {
        const body = await response.json() as { error: string, access_token?: string };

        expect(response.status).toEqual(status);
        expect(body.error).toEqual(error);
        expect(body.access_token).toBeUndefined();
    };

    const passwordGrant = async (name: string, secret: string, realmId?: string) => {
        const response = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: name,
                password: secret,
                ...(realmId ? { realm_id: realmId } : {}),
            },
        });

        expect(response.status).toEqual(200);

        return await response.json() as OAuth2TokenGrantResponse;
    };

    /**
     * The user's real access token re-signed with the given claims, so the
     * subject and its session stay real.
     */
    const resign = async (token: string, claims: OAuth2TokenPayload) : Promise<string> => {
        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);

        return signer.sign({
            ...decodeJwt(token),
            jti: randomUUID(),
            ...claims,
        } as OAuth2TokenPayload);
    };

    beforeAll(async () => {
        await suite.setup();

        password = 'token-exchange-pw-1';

        const input = createFakeUser({ password });

        username = input.name;

        await suite.client.user.create(input);

        userToken = await passwordGrant(username, password);
        actor = await createActor();

        await createCapability(actor.id);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    describe('a successful exchange', () => {
        it('answers exactly the RFC 8693 response for a user subject', async () => {
            const response = await exchange(buildForm(actor));
            const body = await response.json() as Record<string, unknown>;

            expect(response.status).toEqual(200);
            expect(Object.keys(body).sort()).toEqual([
                'access_token',
                'expires_in',
                'issued_token_type',
                'token_type',
            ]);
            expect(body.issued_token_type).toEqual(OAuth2TokenTypeIdentifier.JWT);
            expect(body.token_type).toEqual('Bearer');
            expect(body.expires_in).toEqual(3600);
        });

        it('stamps the claims and omits the ones that must be absent', async () => {
            const response = await exchange(buildForm(actor));
            const { access_token: token } = await response.json() as OAuth2TokenGrantResponse;
            const claims = decodeJwt(token);
            const subject = decodeJwt(userToken.access_token);

            expect(claims.kind).toEqual(OAuth2TokenKind.CAPABILITY);
            expect(claims.aud).toEqual(AUDIENCE);
            expect(claims.cap).toEqual([CAP]);
            expect(claims.act).toEqual({ sub: actor.id, sub_kind: OAuth2SubKind.CLIENT });
            expect(claims.client_id).toEqual(actor.id);
            expect(claims.sub).toEqual(subject.sub);
            expect(claims.sub_kind).toEqual(OAuth2SubKind.USER);
            expect(claims.realm_id).toEqual(subject.realm_id);
            expect(claims.realm_name).toEqual(subject.realm_name);
            expect(claims.iss).toEqual(subject.iss);
            expect(claims.iss).toMatch(/\/realms\/master$/);
            expect(claims.iat).toBeDefined();
            expect(claims.jti).toBeDefined();
            expect(claims.exp! - claims.iat!).toEqual(3600);

            for (const absent of ['scope', 'session_id', 'sid', 'nonce', 'cnf', 'remote_address', 'user_agent']) {
                expect(claims).not.toHaveProperty(absent);
            }
        });

        it('exchanges a client subject', async () => {
            const subject = await createActor({ grantTypes: 'client_credentials' });
            const credentials = await suite.client.token.createWithClientCredentials({
                client_id: subject.id,
                client_secret: subject.secret!,
            });

            const response = await exchange(buildForm(actor, {}, credentials.access_token));
            const body = await response.json() as OAuth2TokenGrantResponse;

            expect(response.status).toEqual(200);

            const claims = decodeJwt(body.access_token);

            expect(claims.sub).toEqual(subject.id);
            expect(claims.sub_kind).toEqual(OAuth2SubKind.CLIENT);
            expect(claims.act).toEqual({ sub: actor.id, sub_kind: OAuth2SubKind.CLIENT });
        });

        it('authenticates the actor through HTTP Basic', async () => {
            const {
                client_id: id, 
                client_secret: secret, 
                ...form 
            } = buildForm(actor);

            const response = await httpRequest(suite, 'POST', '/token', {
                form,
                headers: { Authorization: `Basic ${new TextEncoder().encode(`${id}:${secret}`).toBase64()}` },
            });

            expect(response.status).toEqual(200);
        });

        it('accepts the jwt requested_token_type', async () => {
            const response = await exchange(buildForm(actor, { requested_token_type: OAuth2TokenTypeIdentifier.JWT }));

            expect(response.status).toEqual(200);
        });

        it('clamps expires_in to the capability maximum', async () => {
            const response = await exchange(buildForm(actor, { expires_in: '86400' }));
            const body = await response.json() as OAuth2TokenGrantResponse;

            expect(body.expires_in).toEqual(3600);
        });

        it('honours a shorter expires_in', async () => {
            const response = await exchange(buildForm(actor, { expires_in: '60' }));
            const body = await response.json() as OAuth2TokenGrantResponse;
            const claims = decodeJwt(body.access_token);

            expect(body.expires_in).toEqual(60);
            expect(claims.exp! - claims.iat!).toEqual(60);
        });

        it('leaves nothing in the token repository', async () => {
            const response = await exchange(buildForm(actor));
            const { access_token: token } = await response.json() as OAuth2TokenGrantResponse;
            const claims = decodeJwt(token);

            const repository = suite.container.resolve(OAuth2InjectionToken.TokenRepository);

            await expect(repository.findOneById(claims.jti!)).resolves.toBeNull();
            await expect(repository.findOneBySignature(token)).resolves.toBeNull();
        });

        it('records the audit event at the write boundary', async () => {
            const response = await exchange(buildForm(actor, { expires_in: '42' }));
            const body = await response.json() as OAuth2TokenGrantResponse;
            const claims = decodeJwt(body.access_token);
            const subject = decodeJwt(userToken.access_token);

            const { data } = await suite.client.event.getMany({
                filters: {
                    name: EventName.TOKEN_EXCHANGED,
                    refId: actor.id,
                },
                pagination: { limit: 50 },
                sort: { createdAt: 'DESC' },
            });

            const row = data.find((entry) => entry.data?.jti === claims.jti);

            expect(row).toBeDefined();
            expect(row).toMatchObject({
                scope: EventScope.OAUTH2,
                refType: EventRefType.CLIENT,
                clientId: actor.id,
                actorType: IdentityType.CLIENT,
                actorId: actor.id,
                actorName: actor.name,
                realmId: subject.realm_id,
            });
            expect(row?.data).toMatchObject({
                grantType: OAuth2TokenGrant.TOKEN_EXCHANGE,
                subjectId: subject.sub,
                subjectKind: OAuth2SubKind.USER,
                realmName: subject.realm_name,
                audience: AUDIENCE,
                capabilities: CAP,
                lifetime: 42,
            });
        });
    });

    describe('verification by a resource server', () => {
        it('verifies through /jwks with plain jose', async () => {
            const response = await exchange(buildForm(actor));
            const { access_token: token } = await response.json() as OAuth2TokenGrantResponse;

            const jwks = createRemoteJWKSet(new URL(`${suite.baseURL}/jwks`));

            const { payload, protectedHeader } = await jwtVerify(token, jwks, { audience: AUDIENCE });

            expect(payload.kind).toEqual(OAuth2TokenKind.CAPABILITY);
            expect(protectedHeader.typ).toEqual('JWT');

            await expect(jwtVerify(token, jwks, { audience: 'other' })).rejects.toBeDefined();
        });
    });

    describe('never a bearer for anything else', () => {
        let capability: string;

        beforeAll(async () => {
            const response = await exchange(buildForm(actor));

            capability = (await response.json() as OAuth2TokenGrantResponse).access_token;
        });

        it('is refused by the authorization middleware', async () => {
            const response = await httpRequest(suite, 'GET', '/users', { headers: { Authorization: `Bearer ${capability}` } });

            expect(response.status).toEqual(401);
        });

        it('is reported inactive by introspection', async () => {
            const response = await suite.client.token.introspect(
                { token: capability },
                { authorizationHeaderInherit: true },
            );

            expect(response).toEqual({ active: false });
        });

        it('is refused as a subject token (no chains)', async () => {
            await expectRefused(
                await exchange(buildForm(actor, {}, capability)),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });
    });

    describe('the actor', () => {
        it('answers invalid_client for a wrong secret', async () => {
            await expectRefused(
                await exchange(buildForm(actor, { client_secret: 'wrong' })),
                401,
                OAuth2ErrorCode.INVALID_CLIENT,
            );
        });

        it('answers invalid_client without client authentication', async () => {
            const form = buildForm(actor);

            delete form.client_id;
            delete form.client_secret;

            await expectRefused(await exchange(form), 401, OAuth2ErrorCode.INVALID_CLIENT);
        });

        it('refuses a public client', async () => {
            const publicClient = await createActor({ authMethod: 'none' });

            await createCapability(publicClient.id);

            const form = buildForm(publicClient);

            delete form.client_secret;

            await expectRefused(await exchange(form), 401, OAuth2ErrorCode.INVALID_CLIENT);
        });

        it('answers unauthorized_client when the grant is not listed', async () => {
            const client = await createActor({ grantTypes: 'client_credentials' });

            await createCapability(client.id);

            await expectRefused(await exchange(buildForm(client)), 400, OAuth2ErrorCode.UNAUTHORIZED_CLIENT);
        });

        it('answers unauthorized_client for a client with null grantTypes', async () => {
            const client = await createActor({ grantTypes: null });

            await createCapability(client.id);

            await expectRefused(await exchange(buildForm(client)), 400, OAuth2ErrorCode.UNAUTHORIZED_CLIENT);
        });

        it('answers invalid_target for an actor without a capability', async () => {
            const client = await createActor();

            await expectRefused(await exchange(buildForm(client)), 400, OAuth2ErrorCode.INVALID_TARGET);
        });
    });

    describe('parameters', () => {
        it.each([
            ['subject_token'],
            ['subject_token_type'],
            ['audience'],
            ['cap'],
        ])('answers invalid_request without %s', async (key) => {
            const form = buildForm(actor);

            delete form[key];

            await expectRefused(await exchange(form), 400, OAuth2ErrorCode.INVALID_REQUEST);
        });

        it('refuses another subject_token_type', async () => {
            await expectRefused(
                await exchange(buildForm(actor, { subject_token_type: OAuth2TokenTypeIdentifier.JWT })),
                400,
                OAuth2ErrorCode.INVALID_REQUEST,
            );
        });

        it('refuses another requested_token_type', async () => {
            await expectRefused(
                await exchange(buildForm(actor, { requested_token_type: OAuth2TokenTypeIdentifier.ACCESS_TOKEN })),
                400,
                OAuth2ErrorCode.INVALID_REQUEST,
            );
        });

        it.each([['0'], ['-1'], ['1.5'], ['abc'], ['1e3'], ['']])(
            'answers invalid_request for expires_in=%s',
            async (value) => {
                await expectRefused(
                    await exchange(buildForm(actor, { expires_in: value })),
                    400,
                    OAuth2ErrorCode.INVALID_REQUEST,
                );
            },
        );

        it.each([['scope'], ['resource'], ['actor_token'], ['actor_token_type'], ['unknown']])(
            'ignores an additional %s',
            async (key) => {
                const response = await exchange(buildForm(actor, { [key]: 'value' }));

                expect(response.status).toEqual(200);
            },
        );

        it('answers invalid_request for a malformed cap entry', async () => {
            await expectRefused(
                await exchange(buildForm(actor, { cap: 'bucket:b' })),
                400,
                OAuth2ErrorCode.INVALID_REQUEST,
            );
        });

        it('does not read subject_token from the query string', async () => {
            const { subject_token: token, ...form } = buildForm(actor);

            await expectRefused(
                await exchange(form, `/token?subject_token=${encodeURIComponent(token)}`),
                400,
                OAuth2ErrorCode.INVALID_REQUEST,
            );
        });

        it.each([['realm_id'], ['realm_name']])('ignores %s in the query string', async (key) => {
            const response = await exchange(buildForm(actor), `/token?${key}=master`);

            expect(response.status).toEqual(200);
        });

        it.each([
            ['subject_token'],
            ['subject_token_type'],
            ['audience'],
            ['cap'],
        ])('names a repeated %s as the problem', async (key) => {
            const params = new URLSearchParams(buildForm(actor));

            params.append(key, 'second');

            const response = await httpRequest(suite, 'POST', '/token', {
                body: params.toString(),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const body = await response.json() as {
                error: string, 
                error_description?: string, 
                message?: string 
            };

            expect(response.status).toEqual(400);
            expect(body.error).toEqual(OAuth2ErrorCode.INVALID_REQUEST);
            expect(body.error_description ?? body.message).toEqual(`${key} must be given once.`);
        });

        it('takes a grant parameter from the body when the query carries another', async () => {
            const response = await exchange(buildForm(actor), '/token?cap=bucket:x:read');
            const { access_token: token } = await response.json() as { access_token: string };
            const claims = decodeJwt(token);

            expect(response.status).toEqual(200);
            expect(claims.cap).toEqual(CAP.split(' '));
        });
    });

    describe('the capability', () => {
        it('answers invalid_target for another audience', async () => {
            await expectRefused(
                await exchange(buildForm(actor, { audience: 'other' })),
                400,
                OAuth2ErrorCode.INVALID_TARGET,
            );
        });

        it('compares the audience case-sensitively', async () => {
            await expectRefused(
                await exchange(buildForm(actor, { audience: AUDIENCE.toUpperCase() })),
                400,
                OAuth2ErrorCode.INVALID_TARGET,
            );
        });

        it('answers invalid_target for a capability type not allowed', async () => {
            await expectRefused(
                await exchange(buildForm(actor, { cap: 'analysis:a:read' })),
                400,
                OAuth2ErrorCode.INVALID_TARGET,
            );
        });

        it('honours the actions a type:action entry lists', async () => {
            const client = await createActor();

            await createCapability(client.id, { value: 'bucket:read' });

            const allowed = await exchange(buildForm(client, { cap: 'bucket:a:read' }));

            expect(allowed.status).toEqual(200);

            await expectRefused(
                await exchange(buildForm(client, { cap: 'bucket:a:write' })),
                400,
                OAuth2ErrorCode.INVALID_TARGET,
            );
        });

        it('honours each capability type of the capability', async () => {
            const response = await exchange(buildForm(actor, { cap: 'bucket:a:read bucket-file:b:write' }));
            const body = await response.json() as OAuth2TokenGrantResponse;

            expect(response.status).toEqual(200);
            expect(decodeJwt(body.access_token).cap).toEqual(['bucket:a:read', 'bucket-file:b:write']);
        });
    });

    describe('the subject token', () => {
        it('refuses a garbage token', async () => {
            await expectRefused(
                await exchange(buildForm(actor, {}, 'not.a.jwt')),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });

        it('refuses an expired token', async () => {
            const expired = await resign(userToken.access_token, { exp: Math.floor(Date.now() / 1000) - 3600 });

            await expectRefused(
                await exchange(buildForm(actor, {}, expired)),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });

        it('refuses a refresh token', async () => {
            await expectRefused(
                await exchange(buildForm(actor, {}, userToken.refresh_token!)),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });

        it('refuses a certificate-bound token', async () => {
            const bound = await resign(userToken.access_token, { cnf: { 'x5t#S256': 'thumbprint' } });

            await expectRefused(
                await exchange(buildForm(actor, {}, bound)),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });

        it('refuses a revoked token', async () => {
            const grant = await passwordGrant(username, password);

            await httpRequest(suite, 'POST', '/token/revoke', { form: { token: grant.access_token } });

            await expectRefused(
                await exchange(buildForm(actor, {}, grant.access_token)),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });

        it('refuses the token of a revoked session', async () => {
            const grant = await passwordGrant(username, password);

            await suite.client.session.delete(decodeJwt(grant.access_token).session_id as string);

            await expectRefused(
                await exchange(buildForm(actor, {}, grant.access_token)),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });

        it('refuses the token of an inactive subject', async () => {
            const secret = 'token-exchange-inactive-pw';
            const input = createFakeUser({ password: secret });
            const { data: user } = await suite.client.user.create(input);
            const grant = await passwordGrant(input.name, secret);

            await suite.client.user.update(user.id, { active: false });

            await expectRefused(
                await exchange(buildForm(actor, {}, grant.access_token)),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });
    });

    describe('the subject realm scope', () => {
        let realm: Realm;
        let foreignToken: OAuth2TokenGrantResponse;

        beforeAll(async () => {
            realm = (await suite.client.realm.create(createFakeRealm())).data;

            const secret = 'token-exchange-foreign-pw';
            const input = createFakeUser({ password: secret, realmId: realm.id });

            await suite.client.user.create(input);

            foreignToken = await passwordGrant(input.name, secret, realm.id);
        });

        it('refuses a subject of another realm under own', async () => {
            await expectRefused(
                await exchange(buildForm(actor, {}, foreignToken.access_token)),
                400,
                OAuth2ErrorCode.INVALID_GRANT,
            );
        });

        it('exchanges a subject of another realm under any, signed by that realm', async () => {
            const client = await createActor();

            await createCapability(client.id, { realmScope: ClientTokenExchangeRealmScope.ANY });

            const response = await exchange(buildForm(client, {}, foreignToken.access_token));
            const body = await response.json() as OAuth2TokenGrantResponse;

            expect(response.status).toEqual(200);

            const claims = decodeJwt(body.access_token);

            expect(claims.realm_id).toEqual(realm.id);
            expect(claims.iss).toMatch(new RegExp(`/realms/${realm.name}$`));

            const jwks = createRemoteJWKSet(new URL(`${suite.baseURL}/realms/${realm.id}/jwks`));

            await expect(jwtVerify(body.access_token, jwks, { audience: AUDIENCE })).resolves.toBeDefined();
        });
    });

    describe('the application access policy', () => {
        it('applies to the actor as a backstop', async () => {
            const { data: denyPolicy } = await suite.client.policy.createBuiltIn({
                name: `token-exchange-deny-${randomUUID()}`,
                type: BuiltInPolicyType.IDENTITY,
                invert: false,
                types: [IdentityType.CLIENT],
                realmId: null,
            });

            const client = await createActor({ accessPolicyId: denyPolicy.id });

            await createCapability(client.id);

            const recordAuthorize = vi.spyOn(suite.container.resolve(MetricsInjectionKey), 'recordAuthorize');

            try {
                await expectRefused(await exchange(buildForm(client)), 400, OAuth2ErrorCode.INVALID_GRANT);

                expect(recordAuthorize.mock.calls).toEqual([['denied']]);
            } finally {
                recordAuthorize.mockRestore();
            }

            const { data } = await suite.client.event.getMany({
                filters: {
                    name: EventName.AUTHORIZE_FAILED,
                    refId: client.id,
                },
            });

            expect(data.length).toEqual(1);
            expect(data[0].data).toMatchObject({
                reason: 'accessPolicy',
                grantType: OAuth2TokenGrant.TOKEN_EXCHANGE,
            });
        });

        it('counts no other refusal as an application access policy denial', async () => {
            const recordAuthorize = vi.spyOn(suite.container.resolve(MetricsInjectionKey), 'recordAuthorize');

            try {
                await expectRefused(await exchange(buildForm(actor, { audience: 'other' })), 400, OAuth2ErrorCode.INVALID_TARGET);

                expect(recordAuthorize).not.toHaveBeenCalled();
            } finally {
                recordAuthorize.mockRestore();
            }
        });

        it('lets an allowed subject through', async () => {
            const { data: allowPolicy } = await suite.client.policy.createBuiltIn({
                name: `token-exchange-allow-${randomUUID()}`,
                type: BuiltInPolicyType.IDENTITY,
                invert: false,
                realmId: null,
            });

            const client = await createActor({ accessPolicyId: allowPolicy.id });

            await createCapability(client.id);

            const response = await exchange(buildForm(client));

            expect(response.status).toEqual(200);
        });
    });

    describe('a realm whose active signing key is symmetric', () => {
        it('answers server_error and signs nothing', async () => {
            const keyStore = suite.container.resolve(OAuth2InjectionToken.KeyStore);

            // No key material: a signer reaching the signature would answer a
            // different error than the one asserted.
            const resolveOrCreate = vi.spyOn(keyStore, 'resolveOrCreate')
                .mockResolvedValueOnce({ id: randomUUID(), type: JWKType.OCT } as Key);

            try {
                await expectRefused(await exchange(buildForm(actor)), 500, OAuth2ErrorCode.SERVER_ERROR);

                expect(resolveOrCreate).toHaveBeenCalledTimes(1);
            } finally {
                resolveOrCreate.mockRestore();
            }
        });
    });
});
