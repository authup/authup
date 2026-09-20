/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import type { IdentityPolicyData } from '@authup/access';
import type {
    Client,
    Consent,
    Realm,
    Scope,
    UserIdentity,
} from '@authup/core-kit';
import {
    EventName,
    EventRefType,
    EventScope,
    ScopeName,
    SessionAuthMethod,
} from '@authup/core-kit';
import { ErrorCode, isDeviceVerificationThrottledError } from '@authup/errors';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import { OAuth2ErrorCode, OAuth2SubKind, OAuth2TokenGrant } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type {
    ConsentRecordInput,
    EventRequestContext,
    IConsentService,
    IOAuth2AccessPolicyEvaluator,
    IOAuth2ClientRepository,
    IOAuth2ScopeRepository,
    IUserAuthenticatorChallengeProvider,
    OAuth2DeviceCodeRequest,
    UserAuthenticatorChallengeStatus,
} from '../../../../../src/core/index.ts';
import {
    OAUTH2_DEVICE_CODE_INTERVAL,
    OAUTH2_DEVICE_CODE_MAX_AGE,
    OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR,
    OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW,
    OAUTH2_DEVICE_USER_CODE_MINT_ATTEMPTS,
    OAuth2AuthorizationGate,
    OAuth2DeviceAuthorizationService,
    OAuth2DeviceCodeStatus,
} from '../../../../../src/core/index.ts';
import {
    FakeAuthFlowMetrics,
    FakeEventService,
    FakeOAuth2DeviceCodeRepository,
    FakeSessionManager,
} from '../../helpers/index.ts';

const REALM_ID = randomUUID();
const USER_ID = randomUUID();
const SESSION_ID = randomUUID();
const VERIFICATION_URI = 'https://auth.example.com/device';

const now = () => Math.floor(Date.now() / 1000);

const buildRealm = (data: Partial<Realm> = {}) : Realm => ({
    id: REALM_ID,
    name: 'master',
    displayName: null,
    description: null,
    builtIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
});

const buildClient = (data: Partial<Client> = {}) : Client => {
    const timestamp = new Date().toISOString();
    return {
        id: randomUUID(),
        active: true,
        builtIn: false,
        authMethod: 'none',
        tokenBindingMethod: 'none',
        name: 'device-app',
        displayName: 'Device App',
        description: null,
        secret: null,
        secretHashed: false,
        secretEncrypted: false,
        redirectUri: null,
        postLogoutRedirectUri: null,
        backchannelLogoutUri: null,
        grantTypes: OAuth2TokenGrant.DEVICE_CODE,
        baseUrl: null,
        accessPolicyId: null,
        accessPolicy: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        realmId: REALM_ID,
        realm: buildRealm(),
        pathId: null,
        path: null,
        ...data,
    };
};

const buildScope = (name: string) : Scope => ({
    id: randomUUID(),
    builtIn: true,
    name,
    displayName: null,
    description: null,
    realmId: null,
    realm: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

const buildIdentity = (data: Partial<UserIdentity['data']> = {}) : UserIdentity => ({
    type: OAuth2SubKind.USER,
    data: {
        id: USER_ID,
        name: 'user',
        nameLocked: false,
        firstName: null,
        lastName: null,
        displayName: null,
        email: 'user@example.com',
        emailVerified: false,
        password: null,
        avatar: null,
        cover: null,
        resetHash: null,
        resetAt: null,
        resetExpires: null,
        status: null,
        statusMessage: null,
        active: true,
        activateHash: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        realmId: REALM_ID,
        realm: buildRealm(),
        pathId: null,
        path: null,
        ...data,
    },
});

const buildRequest = (client: Client, input: Partial<OAuth2DeviceCodeRequest> = {}) : OAuth2DeviceCodeRequest => ({
    id: randomBytes(32).toString('hex'),
    user_code: 'BCDFGHJK',
    client_id: client.id,
    realm_id: client.realmId,
    realm_name: 'master',
    scope: 'global openid',
    expires_at: now() + OAUTH2_DEVICE_CODE_MAX_AGE,
    ...input,
});

type FakeClientRepository = IOAuth2ClientRepository & {
    seed(client: Client): Client,
};

const createClientRepository = () : FakeClientRepository => {
    const clients = new Map<string, Client>();

    return {
        seed: (client) => {
            clients.set(client.id, client);
            return client;
        },
        findOneByIdOrName: async (idOrName, realmId) => {
            const client = clients.get(idOrName);
            if (!client || (realmId && client.realmId !== realmId)) {
                return null;
            }

            return client;
        },
    };
};

type FakeScopeRepository = IOAuth2ScopeRepository & {
    scopes: Scope[],
};

const createScopeRepository = () : FakeScopeRepository => {
    const repository : FakeScopeRepository = {
        scopes: [],
        findByClientId: async () => repository.scopes,
    };

    return repository;
};

type FakeAccessPolicyEvaluator = IOAuth2AccessPolicyEvaluator & {
    calls: { policyId: string, subject: IdentityPolicyData }[],
    allowed: boolean,
};

const createAccessPolicyEvaluator = () : FakeAccessPolicyEvaluator => {
    const evaluator : FakeAccessPolicyEvaluator = {
        calls: [],
        allowed: false,
        evaluate: async (policyId, subject) => {
            evaluator.calls.push({ policyId, subject });
            return evaluator.allowed;
        },
    };

    return evaluator;
};

class FakeConsentService implements IConsentService {
    public recordCalls : ConsentRecordInput[] = [];

    public recordError? : Error;

    async record(input: ConsentRecordInput) : Promise<void> {
        this.recordCalls.push(input);

        if (this.recordError) {
            throw this.recordError;
        }
    }

    async isCovering() : Promise<boolean> {
        return false;
    }

    async getMany() : Promise<EntityRepositoryFindManyResult<Consent>> {
        throw new Error('not implemented');
    }

    async getOne() : Promise<Consent> {
        throw new Error('not implemented');
    }

    async delete() : Promise<Consent> {
        throw new Error('not implemented');
    }
}

const challengeProvider = (status: Partial<UserAuthenticatorChallengeStatus>) : IUserAuthenticatorChallengeProvider => ({
    challenge: async () => ({
        required: false,
        enrollmentRequired: false,
        kinds: [],
        ...status,
    }),
});

const requestContext : EventRequestContext = {
    actorType: OAuth2SubKind.USER,
    actorId: USER_ID,
    actorName: 'user',
    sessionId: SESSION_ID,
    requestPath: '/device_authorization/lookup',
    requestMethod: 'POST',
    requestIpAddress: '203.0.113.9',
    requestUserAgent: 'vitest',
};

describe('OAuth2DeviceAuthorizationService', () => {
    let repository : FakeOAuth2DeviceCodeRepository;
    let clientRepository : FakeClientRepository;
    let scopeRepository : FakeScopeRepository;
    let sessionManager : FakeSessionManager;
    let eventService : FakeEventService;
    let metrics : FakeAuthFlowMetrics;
    let consentService : FakeConsentService;
    let accessPolicyEvaluator : FakeAccessPolicyEvaluator;

    const buildService = (
        mfaChallengeProvider?: IUserAuthenticatorChallengeProvider,
    ) => new OAuth2DeviceAuthorizationService({
        repository,
        clientRepository,
        scopeRepository,
        gate: new OAuth2AuthorizationGate({
            sessionManager,
            mfaChallengeProvider,
            accessPolicyEvaluator,
        }),
        consentService,
        eventService,
        metrics,
        requestContext: () => requestContext,
        options: { verificationUri: VERIFICATION_URI },
    });

    const seedSession = async (input: Record<string, any> = {}) => sessionManager.create({
        id: SESSION_ID,
        sub: USER_ID,
        subKind: OAuth2SubKind.USER,
        realmId: REALM_ID,
        authMethod: SessionAuthMethod.PASSWORD,
        createdAt: new Date().toISOString(),
        ...input,
    });

    const seedCode = (client = clientRepository.seed(buildClient()), input: Partial<OAuth2DeviceCodeRequest> = {}) => ({
        client,
        request: repository.seed(buildRequest(client, input)),
    });

    beforeEach(() => {
        repository = new FakeOAuth2DeviceCodeRepository();
        clientRepository = createClientRepository();
        scopeRepository = createScopeRepository();
        sessionManager = new FakeSessionManager();
        eventService = new FakeEventService();
        metrics = new FakeAuthFlowMetrics();
        consentService = new FakeConsentService();
        accessPolicyEvaluator = createAccessPolicyEvaluator();
    });

    describe('issue', () => {
        it('should grant every bound scope when none is requested', async () => {
            scopeRepository.scopes = [buildScope(ScopeName.GLOBAL), buildScope(ScopeName.OPEN_ID)];
            const client = buildClient();

            const response = await buildService().issue(client, buildRealm(), {});

            expect(response.device_code).toMatch(/^[0-9a-f]{64}$/);
            expect(response.user_code).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
            expect(response.verification_uri).toEqual(VERIFICATION_URI);
            expect(response.verification_uri_complete).toEqual(`${VERIFICATION_URI}?user_code=${response.user_code}`);
            expect(response.expires_in).toEqual(OAUTH2_DEVICE_CODE_MAX_AGE);
            expect(response.interval).toEqual(OAUTH2_DEVICE_CODE_INTERVAL);

            expect(repository.saveCalls).toHaveLength(1);
            expect(repository.saveCalls[0]).toMatchObject({
                id: response.device_code,
                user_code: response.user_code.replace('-', ''),
                client_id: client.id,
                realm_id: client.realmId,
                realm_name: 'master',
                scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            });
            expect(repository.saveCalls[0].expires_at).toBeGreaterThan(now());
            expect(eventService.recordCalls).toHaveLength(0);
        });

        it('should refuse a scope the client does not hold', async () => {
            scopeRepository.scopes = [buildScope(ScopeName.OPEN_ID)];

            await expect(buildService().issue(buildClient(), buildRealm(), { scope: 'openid email' }))
                .rejects.toThrow(expect.objectContaining({
                    code: ErrorCode.OAUTH_SCOPE_INSUFFICIENT,
                    data: expect.objectContaining({ error: OAuth2ErrorCode.INSUFFICIENT_SCOPE }),
                }));

            expect(repository.saveCalls).toHaveLength(0);
        });

        it('should pass a request carrying the global scope', async () => {
            scopeRepository.scopes = [buildScope(ScopeName.OPEN_ID)];

            await buildService().issue(buildClient(), buildRealm(), { scope: ScopeName.GLOBAL });

            expect(repository.saveCalls[0].scope).toEqual(ScopeName.GLOBAL);
        });

        it('should regenerate on a user code collision', async () => {
            scopeRepository.scopes = [buildScope(ScopeName.GLOBAL)];
            const save = vi.spyOn(repository, 'save').mockResolvedValueOnce(false);

            const response = await buildService().issue(buildClient(), buildRealm(), {});

            expect(save).toHaveBeenCalledTimes(2);
            expect(save.mock.calls[0][0].user_code).not.toEqual(save.mock.calls[1][0].user_code);
            expect(repository.saveCalls).toHaveLength(1);
            expect(repository.saveCalls[0].id).toEqual(response.device_code);
        });

        it('should give up after five collisions', async () => {
            scopeRepository.scopes = [buildScope(ScopeName.GLOBAL)];
            const save = vi.spyOn(repository, 'save').mockResolvedValue(false);

            await expect(buildService().issue(buildClient(), buildRealm(), {}))
                .rejects.toThrow(expect.objectContaining({
                    code: ErrorCode.INTERNAL_ERROR,
                    data: expect.objectContaining({ error: OAuth2ErrorCode.SERVER_ERROR }),
                }));

            expect(save).toHaveBeenCalledTimes(OAUTH2_DEVICE_USER_CODE_MINT_ATTEMPTS);
        });
    });

    describe('lookup', () => {
        it('should answer one neutral invalid_grant for every miss and record it', async () => {
            const inactive = clientRepository.seed(buildClient({ active: false }));
            repository.seed(buildRequest(inactive, { user_code: 'BCDFGHJM' }));

            const { client } = seedCode();
            repository.seed(buildRequest(client, { user_code: 'BCDFGHJN', expires_at: now() - 1 }));
            const approved = repository.seed(buildRequest(client, { user_code: 'BCDFGHJP' }));
            await repository.decide(approved.id, {
                status: OAuth2DeviceCodeStatus.APPROVED,
                sub: USER_ID,
                sub_kind: OAuth2SubKind.USER,
                session_id: null,
                auth_time: now(),
                auth_method: null,
            }, approved.expires_at);
            const denied = repository.seed(buildRequest(client, { user_code: 'BCDFGHJQ' }));
            await repository.decide(denied.id, { status: OAuth2DeviceCodeStatus.DENIED }, denied.expires_at);

            const service = buildService();
            const identity = buildIdentity();
            const inputs : unknown[] = [
                'WXZB-WXZB',
                'BCDF-GHJN',
                'BCDF-GHJP',
                'BCDF-GHJQ',
                'not a code',
                'BCDF-GHJA',
                42,
                { toString: () => 'BCDF-GHJK' },
                'BCDF-GHJM',
            ];

            const messages = new Set<string>();
            for (const input of inputs) {
                let caught : unknown;
                try {
                    await service.lookup(input, identity);
                } catch (e) {
                    caught = e;
                }

                expect(caught).toMatchObject({
                    code: ErrorCode.OAUTH_GRANT_INVALID,
                    data: expect.objectContaining({ error: OAuth2ErrorCode.INVALID_GRANT }),
                });
                messages.add((caught as Error).message);
            }

            expect(messages.size).toEqual(1);
            expect(repository.countLookupMissCalls).toHaveLength(inputs.length);
            expect(repository.countLookupMissCalls[0]).toEqual({
                key: `actor:${USER_ID}`,
                limit: OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR,
            });

            expect(eventService.recordCalls).toHaveLength(inputs.length);
            for (const call of eventService.recordCalls) {
                expect(call).toMatchObject({
                    scope: EventScope.OAUTH2,
                    name: EventName.AUTHORIZE_FAILED,
                    refId: null,
                    actorType: OAuth2SubKind.USER,
                    actorId: USER_ID,
                    actorName: 'user',
                    realmId: REALM_ID,
                    sessionId: SESSION_ID,
                    requestPath: requestContext.requestPath,
                    requestMethod: requestContext.requestMethod,
                    requestIpAddress: requestContext.requestIpAddress,
                    requestUserAgent: requestContext.requestUserAgent,
                    data: { reason: 'userCode', grantType: OAuth2TokenGrant.DEVICE_CODE },
                });
                expect(call.refType).toBeUndefined();
            }
        });

        it('should answer the summary for a hit and bump no counter', async () => {
            const { client, request } = seedCode();
            const service = buildService();

            for (let i = 0; i < 5; i++) {
                const info = await service.lookup(' bcdf-ghjk ', buildIdentity());

                expect(Object.keys(info.client).sort()).toEqual(['builtIn', 'createdAt', 'displayName', 'id', 'name']);
                expect(info.client).toEqual({
                    id: client.id,
                    name: client.name,
                    displayName: client.displayName,
                    builtIn: client.builtIn,
                    createdAt: client.createdAt,
                });
                expect(info.realm).toEqual({
                    id: client.realm.id,
                    name: client.realm.name,
                    displayName: client.realm.displayName,
                });
                expect(info.scope).toEqual(request.scope);
            }

            expect(repository.countLookupMissCalls).toHaveLength(0);
            expect(repository.lookupThrottleCalls).toHaveLength(5);
            expect(eventService.recordCalls).toHaveLength(0);
        });

        it('should throttle the actor after ten misses, and that actor alone', async () => {
            const { request } = seedCode();
            const service = buildService();
            const identity = buildIdentity();

            for (let i = 0; i < OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR; i++) {
                await expect(service.lookup('WXZB-WXZB', identity))
                    .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
            }

            let caught : unknown;
            try {
                await service.lookup(request.user_code, identity);
            } catch (e) {
                caught = e;
            }

            expect(isDeviceVerificationThrottledError(caught)).toBe(true);
            expect(caught).toMatchObject({ code: ErrorCode.OAUTH_DEVICE_VERIFICATION_THROTTLED });
            const { retryAfter } = (caught as { data: { retryAfter: number } }).data;
            expect(retryAfter).toBeGreaterThanOrEqual(OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW - 1);
            expect(retryAfter).toBeLessThanOrEqual(OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW);
            expect(repository.countLookupMissCalls).toHaveLength(OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR);

            const other = buildIdentity({ id: randomUUID(), name: 'other' });
            const info = await service.lookup(request.user_code, other);
            expect(info.scope).toEqual(request.scope);
        });

        it('should fail closed when the throttle cannot be read', async () => {
            const { request } = seedCode();
            vi.spyOn(repository, 'lookupThrottle').mockRejectedValue(new Error('cache unavailable'));

            let caught : unknown;
            try {
                await buildService().lookup(request.user_code, buildIdentity());
            } catch (e) {
                caught = e;
            }

            expect(isDeviceVerificationThrottledError(caught)).toBe(true);
            expect(caught).toMatchObject({ data: { retryAfter: OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW } });
            expect(repository.findOneByUserCodeCalls).toHaveLength(0);
        });

        it('should refuse a foreign-realm user with login_required and no identity data', async () => {
            const { request } = seedCode();
            const foreignRealmId = randomUUID();

            let caught : unknown;
            try {
                await buildService().lookup(request.user_code, buildIdentity({ realmId: foreignRealmId }));
            } catch (e) {
                caught = e;
            }

            expect(caught).toMatchObject({
                code: ErrorCode.OAUTH_LOGIN_REQUIRED,
                data: expect.objectContaining({ error: OAuth2ErrorCode.LOGIN_REQUIRED }),
            });

            const serialized = JSON.stringify(caught);
            expect(serialized).not.toContain(foreignRealmId);
            expect(serialized).not.toContain(REALM_ID);

            // the lookup is a page render, the device analogue of the `/authorize`
            // GET, so it records NO authorize outcome — it can never produce the
            // counter's other labels, and contributing only login_required would
            // skew the ratio (#3591)
            expect(metrics.authorizeCalls).toEqual([]);
            expect(serialized).not.toContain(USER_ID);
            expect(repository.countLookupMissCalls).toHaveLength(0);
        });
    });

    describe('approve', () => {
        it('should stamp the decision, drop the index, record the consent and the event', async () => {
            const session = await seedSession();
            const { client, request } = seedCode();

            await buildService().approve(request.user_code, buildIdentity(), { sessionId: SESSION_ID });

            expect(repository.decideCalls).toHaveLength(1);
            expect(repository.decideCalls[0]).toEqual({
                id: request.id,
                expiresAt: request.expires_at,
                decision: {
                    status: OAuth2DeviceCodeStatus.APPROVED,
                    sub: USER_ID,
                    sub_kind: OAuth2SubKind.USER,
                    session_id: SESSION_ID,
                    auth_time: Math.floor(new Date(session.createdAt).getTime() / 1000),
                    auth_method: SessionAuthMethod.PASSWORD,
                },
            });
            expect(repository.removeUserCodeCalls).toEqual([request.user_code]);

            expect(consentService.recordCalls).toEqual([{
                clientId: client.id,
                realmId: client.realmId,
                owner: { sub: USER_ID, subKind: OAuth2SubKind.USER },
                scope: request.scope,
            }]);

            expect(eventService.recordCalls).toHaveLength(1);
            expect(eventService.recordCalls[0]).toMatchObject({
                scope: EventScope.OAUTH2,
                name: EventName.AUTHORIZE,
                refType: EventRefType.CLIENT,
                refId: client.id,
                clientId: client.id,
                realmId: request.realm_id,
                actorType: OAuth2SubKind.USER,
                actorId: USER_ID,
                sessionId: SESSION_ID,
                requestPath: requestContext.requestPath,
                requestIpAddress: requestContext.requestIpAddress,
                data: {
                    reason: 'device',
                    grantType: OAuth2TokenGrant.DEVICE_CODE,
                    scope: request.scope,
                },
            });
            expect(metrics.authorizeCalls).toEqual(['issued']);
        });

        it('should record no consent for a built-in client', async () => {
            await seedSession();
            const { request } = seedCode(clientRepository.seed(buildClient({ builtIn: true })));

            await buildService().approve(request.user_code, buildIdentity(), { sessionId: SESSION_ID });

            expect(consentService.recordCalls).toHaveLength(0);
            expect(repository.decideCalls).toHaveLength(1);
        });

        it('should not fail the approval over a consent write failure', async () => {
            await seedSession();
            const { request } = seedCode();
            consentService.recordError = new Error('consent down');

            await buildService().approve(request.user_code, buildIdentity(), { sessionId: SESSION_ID });

            expect(consentService.recordCalls).toHaveLength(1);
            const entity = await repository.findOneById(request.id);
            expect(entity?.decision?.status).toEqual(OAuth2DeviceCodeStatus.APPROVED);
            expect(metrics.authorizeCalls).toEqual(['issued']);
        });

        it('should refuse a foreign-realm user with login_required and record the refusal', async () => {
            await seedSession();
            const { request } = seedCode();

            await expect(buildService().approve(request.user_code, buildIdentity({ realmId: randomUUID() }), { sessionId: SESSION_ID }))
                .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_LOGIN_REQUIRED }));

            expect(repository.decideCalls).toHaveLength(0);
            expect(metrics.authorizeCalls).toEqual(['login_required']);
            expect(eventService.recordCalls).toHaveLength(0);
        });

        it('should require the second factor while the session carries no mfa_at', async () => {
            await seedSession();
            const { request } = seedCode();

            await expect(buildService(challengeProvider({ required: true })).approve(request.user_code, buildIdentity(), { sessionId: SESSION_ID }))
                .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_MFA_REQUIRED }));

            expect(repository.decideCalls).toHaveLength(0);
            expect(metrics.authorizeCalls).toEqual(['mfa_required']);
            expect(eventService.recordCalls).toHaveLength(0);
        });

        it('should approve once the session carries mfa_at', async () => {
            await seedSession({ mfaAt: new Date().toISOString() });
            const { request } = seedCode();

            await buildService(challengeProvider({ required: true })).approve(request.user_code, buildIdentity(), { sessionId: SESSION_ID });

            expect(repository.decideCalls).toHaveLength(1);
            expect(metrics.authorizeCalls).toEqual(['issued']);
        });

        it('should exempt an externally authenticated session from the local factor', async () => {
            await seedSession({ authMethod: SessionAuthMethod.EXTERNAL });
            const { request } = seedCode();

            await buildService(challengeProvider({ required: true })).approve(request.user_code, buildIdentity(), { sessionId: SESSION_ID });

            expect(repository.decideCalls).toHaveLength(1);
            expect(repository.decideCalls[0].decision).toMatchObject({ auth_method: SessionAuthMethod.EXTERNAL });
        });

        it('should refuse a denying access policy and record the denial', async () => {
            await seedSession();
            const { client, request } = seedCode(clientRepository.seed(buildClient({ accessPolicyId: randomUUID() })));

            await expect(buildService().approve(request.user_code, buildIdentity(), { sessionId: SESSION_ID }))
                .rejects.toThrow(expect.objectContaining({
                    code: ErrorCode.OAUTH_ACCESS_DENIED,
                    data: expect.objectContaining({ error: OAuth2ErrorCode.ACCESS_DENIED }),
                }));

            expect(accessPolicyEvaluator.calls).toHaveLength(1);
            expect(repository.decideCalls).toHaveLength(0);
            expect(eventService.recordCalls).toHaveLength(1);
            expect(eventService.recordCalls[0]).toMatchObject({
                name: EventName.AUTHORIZE_FAILED,
                refType: EventRefType.CLIENT,
                refId: client.id,
                sessionId: SESSION_ID,
                data: { reason: 'accessPolicy', grantType: OAuth2TokenGrant.DEVICE_CODE },
            });
            expect(metrics.authorizeCalls).toEqual(['denied']);
        });

        it('should refuse a second decision and keep the first', async () => {
            await seedSession();
            const service = buildService();
            const identity = buildIdentity();

            const denied = seedCode(undefined, { user_code: 'BCDFGHJM' });
            await service.deny(denied.request.user_code, identity);
            await expect(service.approve(denied.request.user_code, identity, { sessionId: SESSION_ID }))
                .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
            expect((await repository.findOneById(denied.request.id))?.decision?.status).toEqual(OAuth2DeviceCodeStatus.DENIED);

            const approved = seedCode(undefined, { user_code: 'BCDFGHJN' });
            await service.approve(approved.request.user_code, identity, { sessionId: SESSION_ID });
            await expect(service.deny(approved.request.user_code, identity))
                .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
            await expect(service.approve(approved.request.user_code, identity, { sessionId: SESSION_ID }))
                .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
            expect((await repository.findOneById(approved.request.id))?.decision?.status).toEqual(OAuth2DeviceCodeStatus.APPROVED);

            expect(repository.decideCalls).toHaveLength(2);
        });

        it('should forgive earlier misses once the actor decided on a code', async () => {
            await seedSession();
            const service = buildService();
            const identity = buildIdentity();
            const { request } = seedCode();
            const pending = seedCode(undefined, { user_code: 'BCDFGHJM' });

            for (let i = 0; i < OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR - 1; i++) {
                await expect(service.lookup('WXZB-WXZB', identity))
                    .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
            }

            await service.approve(request.user_code, identity, { sessionId: SESSION_ID });

            expect(repository.resetLookupMissesCalls).toEqual([`actor:${USER_ID}`]);

            let caught : unknown;
            try {
                await service.lookup('WXZB-WXZB', identity);
            } catch (e) {
                caught = e;
            }

            expect(isDeviceVerificationThrottledError(caught)).toBe(false);
            expect(caught).toMatchObject({ code: ErrorCode.OAUTH_GRANT_INVALID });

            const info = await service.lookup(pending.request.user_code, identity);
            expect(info.scope).toEqual(pending.request.scope);
        });

        it('should forgive once per window, so a self-served decision cannot reset the throttle again', async () => {
            await seedSession();
            const service = buildService();
            const identity = buildIdentity();
            const denied = seedCode(undefined, { user_code: 'BCDFGHJM' });
            const approved = seedCode(undefined, { user_code: 'BCDFGHJN' });
            const pending = seedCode(undefined, { user_code: 'BCDFGHJP' });

            const missNineTimes = async () => {
                for (let i = 0; i < OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR - 1; i++) {
                    await expect(service.lookup('WXZB-WXZB', identity))
                        .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
                }
            };

            await missNineTimes();
            await service.deny(denied.request.user_code, identity);

            await missNineTimes();
            await service.approve(approved.request.user_code, identity, { sessionId: SESSION_ID });

            expect(repository.resetLookupMissesCalls).toEqual([`actor:${USER_ID}`, `actor:${USER_ID}`]);

            // the tenth miss since the single forgiveness: it still answers the
            // neutral refusal and arms the lock behind it
            await expect(service.lookup('WXZB-WXZB', identity))
                .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));

            let caught : unknown;
            try {
                await service.lookup(pending.request.user_code, identity);
            } catch (e) {
                caught = e;
            }

            expect(isDeviceVerificationThrottledError(caught)).toBe(true);
            expect(caught).toMatchObject({ code: ErrorCode.OAUTH_DEVICE_VERIFICATION_THROTTLED });
        });

        it('should not spend the forgiveness on a decision that had nothing to forgive', async () => {
            await seedSession();
            const service = buildService();
            const identity = buildIdentity();
            const clean = seedCode(undefined, { user_code: 'BCDFGHJM' });
            const typed = seedCode(undefined, { user_code: 'BCDFGHJN' });

            // no miss so far: this approval must leave the window's one
            // forgiveness for the typos that follow
            await service.approve(clean.request.user_code, identity, { sessionId: SESSION_ID });

            for (let i = 0; i < OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR - 1; i++) {
                await expect(service.lookup('WXZB-WXZB', identity))
                    .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
            }

            await service.approve(typed.request.user_code, identity, { sessionId: SESSION_ID });

            let caught : unknown;
            try {
                await service.lookup('WXZB-WXZB', identity);
            } catch (e) {
                caught = e;
            }

            expect(isDeviceVerificationThrottledError(caught)).toBe(false);
            expect(caught).toMatchObject({ code: ErrorCode.OAUTH_GRANT_INVALID });
        });

        it('should not fail the approval, nor lose its audit row, over a failed reset', async () => {
            await seedSession();
            const { request } = seedCode();
            repository.resetLookupMisses = async () => {
                throw new Error('the cache is unreachable');
            };

            await buildService().approve(request.user_code, buildIdentity(), { sessionId: SESSION_ID });

            expect(eventService.recordCalls.map((call) => call.name)).toContain(EventName.AUTHORIZE);
        });
    });

    describe('deny', () => {
        it('should write the denied decision, drop the index and record the refusal', async () => {
            const { client, request } = seedCode();

            await buildService().deny(request.user_code, buildIdentity());

            expect(repository.decideCalls).toEqual([{
                id: request.id,
                decision: { status: OAuth2DeviceCodeStatus.DENIED },
                expiresAt: request.expires_at,
            }]);
            expect(repository.removeUserCodeCalls).toEqual([request.user_code]);

            expect(eventService.recordCalls).toHaveLength(1);
            expect(eventService.recordCalls[0]).toMatchObject({
                scope: EventScope.OAUTH2,
                name: EventName.AUTHORIZE_FAILED,
                refType: EventRefType.CLIENT,
                refId: client.id,
                clientId: client.id,
                realmId: request.realm_id,
                actorId: USER_ID,
                sessionId: SESSION_ID,
                requestUserAgent: requestContext.requestUserAgent,
                data: {
                    reason: 'denied',
                    grantType: OAuth2TokenGrant.DEVICE_CODE,
                    scope: request.scope,
                },
            });
            expect(metrics.authorizeCalls).toEqual(['denied']);
            expect(consentService.recordCalls).toHaveLength(0);
        });

        it('should refuse a foreign-realm user with login_required and record the refusal', async () => {
            // the deny ran the same `resolve()` refusal as the approve and recorded
            // nothing, so the realm-mismatch outcome counted approvals only (#3591)
            const { request } = seedCode();

            await expect(buildService().deny(request.user_code, buildIdentity({ realmId: randomUUID() })))
                .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_LOGIN_REQUIRED }));

            expect(repository.decideCalls).toHaveLength(0);
            expect(metrics.authorizeCalls).toEqual(['login_required']);
            expect(eventService.recordCalls).toHaveLength(0);
        });
    });
});
