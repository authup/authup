/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    Client,
    ClientTokenExchangePolicy,
    Identity,
} from '@authup/core-kit';
import {
    ClientTokenExchangeSubjectRealmScope,
    EventName,
    EventRefType,
    EventScope,
    IdentityType,
} from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    JWTError,
    OAuth2ErrorCode,
    OAuth2SubKind,
    OAuth2TokenGrant,
    OAuth2TokenKind,
    OAuth2TokenTypeIdentifier,
    isOAuth2Error,
} from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { parseOAuth2Capabilities } from '../../../../../src/core/oauth2/capability/index.ts';
import { OAuth2TokenExchangeGrant } from '../../../../../src/core/oauth2/grant-types/token-exchange.ts';
import type { OAuth2TokenExchangeInput } from '../../../../../src/core/oauth2/grant-types/types.ts';
import {
    FakeEventService,
    FakeIdentityResolver,
    FakeOAuth2TokenIssuer,
    FakeOAuth2TokenVerifier,
    FakeSessionManager,
} from '../../helpers/index.ts';

const NOW = () => Math.floor(Date.now() / 1000);

describe('OAuth2TokenExchangeGrant', () => {
    const actorRealmId = randomUUID();
    const subjectRealmId = randomUUID();
    const subjectId = randomUUID();
    const sessionId = randomUUID();

    const client = {
        id: randomUUID(),
        name: 'hub-core',
        realmId: actorRealmId,
    } as Client;

    let issuer: FakeOAuth2TokenIssuer;
    let verifier: FakeOAuth2TokenVerifier;
    let sessionManager: FakeSessionManager;
    let identityResolver: FakeIdentityResolver;
    let eventService: FakeEventService;
    let policy: ClientTokenExchangePolicy;
    let policyLookups: Record<string, unknown>[];
    let grant: OAuth2TokenExchangeGrant;

    function buildPayload(overrides: OAuth2TokenPayload = {}) : OAuth2TokenPayload {
        return {
            kind: OAuth2TokenKind.ACCESS,
            jti: randomUUID(),
            sub: subjectId,
            sub_kind: OAuth2SubKind.USER,
            realm_id: subjectRealmId,
            realm_name: 'subject-realm',
            session_id: sessionId,
            exp: NOW() + 600,
            ...overrides,
        };
    }

    function buildInput(overrides: Partial<OAuth2TokenExchangeInput> = {}) : OAuth2TokenExchangeInput {
        return {
            client,
            subjectToken: 'subject',
            audience: 'storage',
            capabilities: parseOAuth2Capabilities('bucket:b:read'),
            ...overrides,
        };
    }

    async function expectRefused(input: OAuth2TokenExchangeInput, code: OAuth2ErrorCode) {
        let error : unknown;

        try {
            await grant.authorize(input);
        } catch (e) {
            error = e;
        }

        expect(isOAuth2Error(error)).toBe(true);
        expect((error as { data: { error: string } }).data.error).toEqual(code);
        expect(issuer.issueCalls).toHaveLength(0);
    }

    beforeEach(async () => {
        issuer = new FakeOAuth2TokenIssuer();
        verifier = new FakeOAuth2TokenVerifier();
        sessionManager = new FakeSessionManager();
        identityResolver = new FakeIdentityResolver();
        eventService = new FakeEventService();

        policy = {
            id: randomUUID(),
            clientId: client.id,
            audience: 'storage',
            capabilityTypes: 'bucket bucket-file',
            maxLifetime: 3600,
            subjectRealmScope: ClientTokenExchangeSubjectRealmScope.ANY,
            realmId: actorRealmId,
        } as ClientTokenExchangePolicy;
        policyLookups = [];

        verifier.seed('subject', buildPayload());

        await sessionManager.create({
            id: sessionId,
            sub: subjectId,
            subKind: IdentityType.USER,
            realmId: subjectRealmId,
        });

        identityResolver.setIdentity({
            type: IdentityType.USER,
            data: {
                id: subjectId,
                realmId: subjectRealmId,
                active: true,
            },
        } as Identity);

        grant = new OAuth2TokenExchangeGrant({
            capabilityTokenIssuer: issuer,
            policyRepository: {
                findOneBy: async (where: Record<string, unknown>) => {
                    policyLookups.push(where);

                    return policy;
                },
            },
            tokenVerifier: verifier,
            sessionManager,
            identityResolver,
            eventService,
        });
    });

    async function run(input: OAuth2TokenExchangeInput = buildInput()) {
        const decision = await grant.authorize(input);

        return grant.issue(decision, { ipAddress: '10.0.0.1', userAgent: 'hub' });
    }

    describe('a successful exchange', () => {
        it('answers exactly the RFC 8693 response', async () => {
            const response = await run();

            expect(Object.keys(response).sort()).toEqual([
                'access_token',
                'expires_in',
                'issued_token_type',
                'token_type',
            ]);
            expect(response.token_type).toEqual('Bearer');
            expect(response.issued_token_type).toEqual(OAuth2TokenTypeIdentifier.JWT);
            expect(response.expires_in).toEqual(3600);
        });

        it('issues the subject, the audience, the entries and the actor', async () => {
            await run(buildInput({ capabilities: parseOAuth2Capabilities('bucket:b:read,write bucket-file:f:read') }));

            expect(issuer.issueCalls).toHaveLength(1);

            const [claims] = issuer.issueCalls;

            expect(claims).toMatchObject({
                sub: subjectId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: subjectRealmId,
                realm_name: 'subject-realm',
                aud: 'storage',
                cap: ['bucket:b:read,write', 'bucket-file:f:read'],
                act: { sub: client.id, sub_kind: OAuth2SubKind.CLIENT },
                client_id: client.id,
            });

            for (const absent of ['scope', 'session_id', 'sid', 'nonce', 'cnf', 'remote_address', 'user_agent']) {
                expect(claims).not.toHaveProperty(absent);
            }
        });

        it('does not touch the subject session', async () => {
            await run();

            expect(sessionManager.pingCalls).toHaveLength(0);
            expect(sessionManager.refreshCalls).toHaveLength(0);
            expect(sessionManager.createCalls).toHaveLength(1);
        });

        it('verifies the subject token with the active check on', async () => {
            await run();

            expect(verifier.verifyCalls).toEqual([{ token: 'subject', options: undefined }]);
        });

        it('records the audit event', async () => {
            await run();

            const [claims] = issuer.issueCalls;

            expect(eventService.recordCalls).toHaveLength(1);
            expect(eventService.recordCalls[0]).toMatchObject({
                scope: EventScope.OAUTH2,
                name: EventName.TOKEN_EXCHANGED,
                refType: EventRefType.CLIENT,
                refId: client.id,
                clientId: client.id,
                actorType: IdentityType.CLIENT,
                actorId: client.id,
                actorName: 'hub-core',
                realmId: subjectRealmId,
                requestIpAddress: '10.0.0.1',
                requestUserAgent: 'hub',
                data: {
                    grantType: OAuth2TokenGrant.TOKEN_EXCHANGE,
                    subjectId,
                    subjectKind: OAuth2SubKind.USER,
                    realmName: 'subject-realm',
                    audience: 'storage',
                    capabilities: 'bucket:b:read',
                    lifetime: 3600,
                },
            });
            expect(eventService.recordCalls[0].data?.jti).toBeDefined();
            expect(claims.client_id).toEqual(eventService.recordCalls[0].clientId);
        });

        it('carries the jti of the issued token in the audit event', async () => {
            const original = issuer.issue.bind(issuer);
            let issued : string | undefined;

            issuer.issue = async (input) => {
                const output = await original(input);

                issued = output[1].jti;

                return output;
            };

            await run();

            expect(eventService.recordCalls[0].data?.jti).toEqual(issued);
        });
    });

    describe('the decision', () => {
        it('carries everything issue reads', async () => {
            await expect(grant.authorize(buildInput({ expiresIn: 60 }))).resolves.toMatchObject({
                client,
                audience: 'storage',
                capabilities: ['bucket:b:read'],
                lifetime: 60,
                subject: { sub: subjectId },
            });
        });
    });

    describe('lifetime', () => {
        it('defaults to the policy maximum', async () => {
            const response = await run();

            expect(response.expires_in).toEqual(3600);
        });

        it('honours a shorter requested lifetime', async () => {
            const response = await run(buildInput({ expiresIn: 60 }));
            const [claims] = issuer.issueCalls;

            expect(response.expires_in).toEqual(60);
            expect(claims.exp).toBeLessThanOrEqual(NOW() + 60);
            expect(claims.exp).toBeGreaterThanOrEqual(NOW() + 58);
        });

        it('clamps a longer requested lifetime to the policy maximum', async () => {
            policy.maxLifetime = 120;

            const response = await run(buildInput({ expiresIn: 86400 }));

            expect(response.expires_in).toEqual(120);
        });

        it('may outlive the subject token up to the policy maximum', async () => {
            verifier.seed('short', buildPayload({ exp: NOW() + 10 }));

            const response = await run(buildInput({ subjectToken: 'short' }));

            expect(response.expires_in).toEqual(3600);
        });
    });

    describe('the policy', () => {
        it('looks the policy up by the actor and the audience', async () => {
            await run();

            expect(policyLookups).toEqual([{ clientId: client.id, audience: 'storage' }]);
        });

        it('answers invalid_target when the actor has no policy for the audience', async () => {
            grant = new OAuth2TokenExchangeGrant({
                capabilityTokenIssuer: issuer,
                policyRepository: { findOneBy: async () => null },
                tokenVerifier: verifier,
                sessionManager,
                identityResolver,
            });

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_TARGET);
        });

        it('compares the audience strictly, whatever the collation answered', async () => {
            policy.audience = 'Storage';

            await expectRefused(buildInput({ audience: 'storage' }), OAuth2ErrorCode.INVALID_TARGET);
        });

        it.each([
            ['with whitespace', 'stor age'],
            ['with a trailing space', 'storage '],
            ['with a NUL byte', 'stor\0age'],
            ['longer than the column', 'a'.repeat(257)],
        ])('answers invalid_target for an audience %s without a lookup', async (_label, audience) => {
            await expectRefused(buildInput({ audience }), OAuth2ErrorCode.INVALID_TARGET);
            expect(policyLookups).toHaveLength(0);
        });

        it('answers invalid_target for a capability type the policy does not allow', async () => {
            await expectRefused(
                buildInput({ capabilities: parseOAuth2Capabilities('bucket:b:read other:o:read') }),
                OAuth2ErrorCode.INVALID_TARGET,
            );
        });

        it('checks the policy before it looks at the subject token', async () => {
            policy.capabilityTypes = 'other';

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_TARGET);
            expect(verifier.verifyCalls).toHaveLength(0);
        });
    });

    describe('the subject token', () => {
        it.each([
            OAuth2TokenKind.REFRESH,
            OAuth2TokenKind.MFA,
            OAuth2TokenKind.ID_TOKEN,
            OAuth2TokenKind.CAPABILITY,
        ])('refuses a token of kind %s', async (kind) => {
            verifier.seed('other', buildPayload({ kind }));

            await expectRefused(buildInput({ subjectToken: 'other' }), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('refuses a token without a kind', async () => {
            verifier.seed('kindless', buildPayload({ kind: undefined }));

            await expectRefused(buildInput({ subjectToken: 'kindless' }), OAuth2ErrorCode.INVALID_GRANT);
        });

        it.each(['realm_id', 'sub', 'sub_kind', 'session_id'] as const)('refuses a token without %s', async (claim) => {
            verifier.seed('partial', buildPayload({ [claim]: undefined }));

            await expectRefused(buildInput({ subjectToken: 'partial' }), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for a token the verifier refuses', async () => {
            await expectRefused(buildInput({ subjectToken: 'unknown' }), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for a revoked token', async () => {
            const payload = buildPayload();

            verifier.seed('revoked', payload);
            verifier.setInactive(payload.jti as string);

            await expectRefused(buildInput({ subjectToken: 'revoked' }), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for a session that does not exist', async () => {
            verifier.seed('gone', buildPayload({ session_id: randomUUID() }));

            await expectRefused(buildInput({ subjectToken: 'gone' }), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for a revoked session', async () => {
            await sessionManager.revoke(sessionId);

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for a token past exp that the verifier still served', async () => {
            verifier.seed('lapsed', buildPayload({ exp: NOW() - 1 }));

            await expectRefused(buildInput({ subjectToken: 'lapsed' }), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for an expired session', async () => {
            sessionManager.verifyError = JWTError.expired();

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for a session of another subject', async () => {
            await sessionManager.revoke(sessionId);
            await sessionManager.create({
                id: sessionId,
                sub: randomUUID(),
                subKind: IdentityType.USER,
                realmId: subjectRealmId,
            });

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for a subject that does not resolve', async () => {
            identityResolver.setIdentity(null);

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for an inactive subject', async () => {
            identityResolver.setIdentity({
                type: IdentityType.USER,
                data: {
                    id: subjectId,
                    realmId: subjectRealmId,
                    active: false,
                },
            } as Identity);

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('answers invalid_grant for a subject of another realm than the token names', async () => {
            identityResolver.setIdentity({
                type: IdentityType.USER,
                data: {
                    id: subjectId,
                    realmId: randomUUID(),
                    active: true,
                },
            } as Identity);

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('refuses a certificate-bound subject token', async () => {
            verifier.seed('bound', buildPayload({ cnf: { 'x5t#S256': 'thumbprint' } }));

            await expectRefused(buildInput({ subjectToken: 'bound' }), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('lets a verifier fault surface instead of reporting a bad grant', async () => {
            const fault = new Error('key store unavailable');

            verifier.verify = async () => {
                throw fault;
            };

            await expect(grant.authorize(buildInput())).rejects.toBe(fault);
        });
    });

    describe('the subject realm scope', () => {
        it('allows a subject of any realm under `any`', async () => {
            await expect(run()).resolves.toBeDefined();
        });

        it('refuses a subject of another realm under `own`', async () => {
            policy.subjectRealmScope = ClientTokenExchangeSubjectRealmScope.OWN;

            await expectRefused(buildInput(), OAuth2ErrorCode.INVALID_GRANT);
        });

        it('allows a subject of the actor realm under `own`', async () => {
            policy.subjectRealmScope = ClientTokenExchangeSubjectRealmScope.OWN;

            verifier.seed('own', buildPayload({ realm_id: actorRealmId }));
            await sessionManager.revoke(sessionId);
            await sessionManager.create({
                id: sessionId,
                sub: subjectId,
                subKind: IdentityType.USER,
                realmId: actorRealmId,
            });
            identityResolver.setIdentity({
                type: IdentityType.USER,
                data: {
                    id: subjectId,
                    realmId: actorRealmId,
                    active: true,
                },
            } as Identity);

            await expect(run(buildInput({ subjectToken: 'own' }))).resolves.toBeDefined();
        });
    });
});
