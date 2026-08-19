/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    Client,
    OAuth2AuthorizationCodeRequest,
    OAuth2IdentityProvider,
    Session,
    User,
} from '@authup/core-kit';
import {
    IdentityProviderProtocol,
    IdentityType,
    SessionAuthMethod,
} from '@authup/core-kit';
import {
    OAuth2AuthenticationContextClass,
    OAuth2AuthenticationMethodReference,
    OAuth2ErrorCode,
    OAuth2RequestError,
} from '@authup/specs';
import { BadRequestError, InternalError } from '@authup/errors';
import { describe, expect, it } from 'vitest';
import { OAuth2FederatedLoginService } from '../../../../../src/core/oauth2/federated-login/module.ts';
import { OAuth2FederatedLoginRefusal } from '../../../../../src/core/oauth2/federated-login/types.ts';
import { IdentityProviderAssuranceError } from '../../../../../src/core/identity/provider/authentication/protocols/oauth2/assurance.ts';
import type { IOAuth2AuthorizationCodeRequestVerifier } from '../../../../../src/core/oauth2/authorization/index.ts';
import type { IOAuth2AccessPolicyEvaluator } from '../../../../../src/core/oauth2/access-policy/index.ts';
import type { IIdentityProviderAccountManager } from '../../../../../src/core/identity/provider/account/types.ts';
import { FakeRealmRepository } from '../../entities/realm/fake-repository.ts';
import { FakeOAuth2TokenIssuer, FakeSessionManager } from '../../helpers/index.ts';
import { FakePendingLoginStore } from './fake-pending-login-store.ts';
import { FakeVerifier } from './fake-verifier.ts';

const REDIRECT_URI = 'https://app.example.com/callback';

const codeRequest = {
    response_type: 'code',
    client_id: randomUUID(),
    redirect_uri: REDIRECT_URI,
    state: 'state-1',
} as OAuth2AuthorizationCodeRequest;

// realmId is non-nullable on the domain type, but the column is nullable and
// a global provider carries null — which is what the guard's falsy branch is for
function createProvider(
    overrides: Omit<Partial<OAuth2IdentityProvider>, 'realmId'> & { realmId?: string | null } = {},
) : OAuth2IdentityProvider {
    return {
        id: randomUUID(),
        name: 'upstream',
        protocol: IdentityProviderProtocol.OAUTH2,
        enabled: true,
        realmId: null,
        ...overrides,
    } as OAuth2IdentityProvider;
}

function createUser(overrides: Partial<User> = {}) : User {
    return {
        id: randomUUID(),
        name: 'jane',
        active: true,
        realmId: randomUUID(),
        ...overrides,
    } as User;
}

function buildService(options: {
    verifier?: IOAuth2AuthorizationCodeRequestVerifier,
    user?: User,
    accessPolicyEvaluator?: IOAuth2AccessPolicyEvaluator,
    authenticate?: () => Promise<User>,
} = {}) {
    const pendingLoginStore = new FakePendingLoginStore();
    const sessionManager = new FakeSessionManager();
    const accessTokenIssuer = new FakeOAuth2TokenIssuer();
    const refreshTokenIssuer = new FakeOAuth2TokenIssuer();

    const service = new OAuth2FederatedLoginService({
        options: { baseURL: 'https://idp.example.com/' },
        accountManager: {} as IIdentityProviderAccountManager,
        realmRepository: new FakeRealmRepository(),
        codeRequestVerifier: options.verifier ?? new FakeVerifier({}),
        sessionManager,
        pendingLoginStore,
        accessTokenIssuer,
        refreshTokenIssuer,
        accessPolicyEvaluator: options.accessPolicyEvaluator,
        // the seam that keeps the ladder testable: no external provider is
        // contacted, so every branch below runs without a network stub
        authenticatorFactory: () => ({
            authenticate: options.authenticate ??
                (async () => options.user ?? createUser()),
        } as any),
    });

    return {
        service, 
        pendingLoginStore, 
        sessionManager, 
        accessTokenIssuer,
        refreshTokenIssuer,
    };
}

describe('core/oauth2/federated-login — OAuth2FederatedLoginService', () => {
    it('should establish a pending session the browser can complete', async () => {
        const user = createUser();
        const provider = createProvider();
        const {
            service, 
            pendingLoginStore, 
            sessionManager, 
        } = buildService({ user });

        const result = await service.complete({
            provider,
            codeRequest,
            code: 'provider-code',
            request: { ipAddress: '203.0.113.7', userAgent: 'agent' },
        });

        expect(result.kind).toEqual('issued');
        if (result.kind !== 'issued') {
            return;
        }

        // no authorization code: the RP's code is issued at the end of the
        // hosted ladder, once the second factor and consent have run
        expect(typeof result.pendingLoginId).toEqual('string');
        expect(pendingLoginStore.saved).toHaveLength(1);
        expect(result.codeRequest).toEqual(codeRequest);

        const [session] = sessionManager.createCalls;
        expect(session).toMatchObject({
            sub: user.id,
            subKind: IdentityType.USER,
            realmId: user.realmId,
            authMethod: SessionAuthMethod.EXTERNAL,
            mfaAt: null,
            ipAddress: '203.0.113.7',
            userAgent: 'agent',
        });
        expect(new Date(session.expiresAt as string).getTime())
            .toBeGreaterThan(Date.now());

        expect(pendingLoginStore.saved[0]).toMatchObject({
            providerId: provider.id,
            userName: user.name,
        });
    });

    it('should refuse a provider and client realm mismatch', async () => {
        const verifier = new FakeVerifier({
            client: {
                id: codeRequest.client_id, 
                name: 'app', 
                realmId: randomUUID(), 
            } as Client, 
        });
        const {
            service, 
            pendingLoginStore, 
            sessionManager, 
        } = buildService({ verifier });

        await expect(service.complete({
            provider: createProvider({ realmId: randomUUID() }),
            codeRequest: { ...codeRequest, realm_id: randomUUID() },
            code: 'provider-code',
        })).rejects.toThrow(OAuth2RequestError);

        expect(pendingLoginStore.saved).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(0);
    });

    /**
     * The guard reads the client the verification resolved, never the
     * `realm_id` the state blob happens to carry: that value is only present
     * because `authorize-out` stores the verified request, so a guard resting
     * on it would disappear for a state that reached here without the stamp.
     */
    it('should refuse a realm mismatch even when the state carries no realm', async () => {
        const providerRealmId = randomUUID();
        const verifier = new FakeVerifier({
            client: {
                id: codeRequest.client_id, 
                name: 'app', 
                realmId: randomUUID(), 
            } as Client, 
        });
        const { service } = buildService({ verifier });

        const withoutRealm : Record<string, unknown> = { ...codeRequest };
        delete withoutRealm.realm_id;

        await expect(service.complete({
            provider: createProvider({ realmId: providerRealmId }),
            codeRequest: withoutRealm as OAuth2AuthorizationCodeRequest,
            code: 'provider-code',
        })).rejects.toThrow(OAuth2RequestError);
    });

    it('should let a realm-less provider complete for any client realm', async () => {
        const verifier = new FakeVerifier({
            client: {
                id: codeRequest.client_id, 
                name: 'app', 
                realmId: randomUUID(), 
            } as Client, 
        });
        const { service } = buildService({ verifier });

        const result = await service.complete({
            provider: createProvider({ realmId: null }),
            codeRequest,
            code: 'provider-code',
        });

        expect(result.kind).toEqual('issued');
    });

    it('should refuse without a marker when the code request no longer verifies', async () => {
        const verifier = new FakeVerifier(OAuth2RequestError.malformed('client is gone'));
        const {
            service, 
            pendingLoginStore, 
            sessionManager, 
        } = buildService({ verifier });

        const result = await service.complete({
            provider: createProvider(),
            codeRequest,
            code: 'provider-code',
        });

        expect(result).toEqual({
            kind: 'refused',
            refusal: OAuth2FederatedLoginRefusal.CODE_REQUEST,
            codeRequest,
        });
        // the hosted page re-runs the same verifier, so nothing is echoed
        expect(result.kind === 'refused' && result.error).toBeFalsy();
        expect(pendingLoginStore.saved).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(0);
    });

    it('should rethrow a server failure rather than reporting it as a refusal', async () => {
        const verifier = new FakeVerifier(new Error('the database is unreachable'));
        const { service } = buildService({ verifier });

        await expect(service.complete({
            provider: createProvider(),
            codeRequest,
            code: 'provider-code',
        })).rejects.toThrow('the database is unreachable');
    });

    it('should refuse an unverified redirect_uri', async () => {
        const verifier = new FakeVerifier({ redirectUriVerified: false });
        const { service } = buildService({ verifier });

        await expect(service.complete({
            provider: createProvider(),
            codeRequest,
            code: 'provider-code',
        })).rejects.toThrow(OAuth2RequestError);
    });

    it('should refuse a script-capable redirect_uri scheme', async () => {
        // fails closed should the client validator and the code-request
        // verifier both gap: the hosted page navigates the target at the end
        // of the ladder
        // eslint-disable-next-line no-script-url -- the scheme under test
        const request = { ...codeRequest, redirect_uri: 'javascript:alert(1)' } as OAuth2AuthorizationCodeRequest;
        const {
            service, 
            pendingLoginStore, 
            sessionManager, 
        } = buildService();

        await expect(service.complete({
            provider: createProvider(),
            codeRequest: request,
            code: 'provider-code',
        })).rejects.toThrow(InternalError);

        expect(pendingLoginStore.saved).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(0);
    });

    it('should refuse a login once the provider was disabled', async () => {
        let authenticated = false;
        const {
            service, 
            pendingLoginStore, 
            sessionManager, 
        } = buildService({
            authenticate: async () => {
                authenticated = true;
                return createUser();
            },
        });

        const result = await service.complete({
            provider: createProvider({ enabled: false }),
            codeRequest,
            code: 'provider-code',
        });

        expect(result).toMatchObject({
            kind: 'refused',
            refusal: OAuth2FederatedLoginRefusal.PROVIDER_DISABLED,
            error: OAuth2ErrorCode.LOGIN_REQUIRED,
        });
        // refused before the provider's single-use code is spent
        expect(authenticated).toBe(false);
        expect(pendingLoginStore.saved).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(0);
    });

    it('should refuse an inactive user', async () => {
        const {
            service, 
            pendingLoginStore, 
            sessionManager, 
        } = buildService({ user: createUser({ active: false }) });

        const result = await service.complete({
            provider: createProvider(),
            codeRequest,
            code: 'provider-code',
        });

        expect(result).toMatchObject({
            kind: 'refused',
            refusal: OAuth2FederatedLoginRefusal.USER_INACTIVE,
            error: OAuth2ErrorCode.ACCESS_DENIED,
        });
        expect(pendingLoginStore.saved).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(0);
    });

    it('should refuse when the upstream misses the provider assurance allow-list', async () => {
        const {
            service,
            pendingLoginStore,
            sessionManager,
        } = buildService({
            // what the authenticator raises once `requiredAmr` / `requiredAcr`
            // is set and the upstream id_token does not satisfy it (issue #3477)
            authenticate: async () => {
                throw new IdentityProviderAssuranceError('the amr claim does not satisfy: mfa.');
            },
        });

        const result = await service.complete({
            provider: createProvider({ requiredAmr: 'mfa' }),
            codeRequest,
            code: 'provider-code',
        });

        expect(result).toMatchObject({
            kind: 'refused',
            refusal: OAuth2FederatedLoginRefusal.ASSURANCE_INSUFFICIENT,
            // the marker set the hosted page maps is closed, so the reason
            // reaches the log and never the browser
            error: OAuth2ErrorCode.ACCESS_DENIED,
        });
        expect(pendingLoginStore.saved).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(0);
    });

    it('should let any other authenticator failure keep throwing', async () => {
        const { service } = buildService({
            authenticate: async () => {
                throw new Error('the provider token endpoint is unreachable');
            },
        });

        await expect(service.complete({
            provider: createProvider(),
            codeRequest,
            code: 'provider-code',
        })).rejects.toThrow('the provider token endpoint is unreachable');
    });

    it('should refuse when the application access policy denies the identity', async () => {
        const accessPolicyId = randomUUID();
        const verifier = new FakeVerifier({
            client: {
                id: codeRequest.client_id, 
                name: 'app', 
                accessPolicyId, 
            } as Client, 
        });
        const {
            service, 
            pendingLoginStore, 
            sessionManager, 
        } = buildService({
            verifier,
            accessPolicyEvaluator: { evaluate: async () => false },
        });

        const result = await service.complete({
            provider: createProvider(),
            codeRequest,
            code: 'provider-code',
        });

        expect(result).toMatchObject({
            kind: 'refused',
            refusal: OAuth2FederatedLoginRefusal.ACCESS_DENIED,
            error: OAuth2ErrorCode.ACCESS_DENIED,
        });
        expect(pendingLoginStore.saved).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(0);
    });

    it('should fail closed when a client carries an access policy but no evaluator is wired', async () => {
        const verifier = new FakeVerifier({
            client: {
                id: codeRequest.client_id, 
                name: 'app', 
                accessPolicyId: randomUUID(), 
            } as Client, 
        });
        const { service } = buildService({ verifier });

        const result = await service.complete({
            provider: createProvider(),
            codeRequest,
            code: 'provider-code',
        });

        expect(result).toMatchObject({
            kind: 'refused',
            refusal: OAuth2FederatedLoginRefusal.ACCESS_DENIED,
        });
    });
});

describe('core/oauth2/federated-login — completing the handoff', () => {
    async function begin() {
        const provider = createProvider();
        const parts = buildService();

        const result = await parts.service.complete({
            provider,
            codeRequest,
            code: 'provider-code',
            request: { ipAddress: '203.0.113.7', userAgent: 'agent' },
        });

        if (result.kind !== 'issued') {
            throw new Error('the completion was refused');
        }

        return {
            ...parts,
            provider,
            pendingLoginId: result.pendingLoginId,
            sessionId: parts.pendingLoginStore.saved[0].sessionId,
        };
    }

    it('should exchange the pending login for the grant of its session', async () => {
        const {
            service, 
            provider, 
            pendingLoginId, 
            sessionId, 
            sessionManager, 
            accessTokenIssuer,
        } = await begin();

        const grant = await service.completeHandoff({ pendingLoginId, providerId: provider.id });

        expect(grant.access_token).toBeTruthy();
        expect(grant.refresh_token).toBeTruthy();
        // the pending session becomes a regular one
        expect(sessionManager.refreshCalls).toHaveLength(1);
        // the claims say the authentication was external, and assert no
        // assurance level authup did not verify
        expect(accessTokenIssuer.issueCalls[0]).toMatchObject({
            amr: [OAuth2AuthenticationMethodReference.EXTERNAL],
            session_id: sessionId,
        });
        expect(accessTokenIssuer.issueCalls[0].acr).toBeUndefined();
    });

    it('should refuse a pending login whose session has expired', async () => {
        const {
            service, 
            provider, 
            pendingLoginId, 
            sessionId, 
            sessionManager, 
        } = await begin();

        // the pending session carries the login's own deadline; the cache
        // entry normally expires with it, so this is the clock-skew case
        const session = await sessionManager.findOneById(sessionId) as Session;
        session.expiresAt = new Date(Date.now() - 1_000).toISOString();

        await expect(service.completeHandoff({ pendingLoginId, providerId: provider.id }))
            .rejects.toThrow(/unknown or expired/);

        expect(sessionManager.refreshCalls).toHaveLength(0);
    });

    it('should carry a completed factor into the claims', async () => {
        const {
            service, 
            provider, 
            pendingLoginId, 
            sessionId, 
            sessionManager, 
            accessTokenIssuer,
        } = await begin();

        // an application asking for MFA explicitly is the one case that still
        // challenges an externally authenticated session
        const session = await sessionManager.findOneById(sessionId) as Session;
        await sessionManager.markMfaVerified(session);

        await service.completeHandoff({ pendingLoginId, providerId: provider.id });

        expect(accessTokenIssuer.issueCalls[0]).toMatchObject({
            amr: [
                OAuth2AuthenticationMethodReference.EXTERNAL,
                OAuth2AuthenticationMethodReference.OTP,
            ],
            acr: OAuth2AuthenticationContextClass.MFA,
        });
    });

    it('should refuse a replayed completion', async () => {
        const {
            service, 
            provider, 
            pendingLoginId, 
        } = await begin();

        await service.completeHandoff({ pendingLoginId, providerId: provider.id });

        await expect(service.completeHandoff({ pendingLoginId, providerId: provider.id }))
            .rejects.toThrow(BadRequestError);
    });

    it('should refuse an unknown pending login', async () => {
        const {
            service, 
            provider, 
            accessTokenIssuer, 
        } = await begin();

        await expect(service.completeHandoff({ pendingLoginId: 'nope', providerId: provider.id }))
            .rejects.toThrow(BadRequestError);

        expect(accessTokenIssuer.issueCalls).toHaveLength(0);
    });

    it('should refuse a pending login completed at another provider', async () => {
        const {
            service, 
            pendingLoginId, 
            accessTokenIssuer, 
        } = await begin();

        await expect(service.completeHandoff({ pendingLoginId, providerId: randomUUID() }))
            .rejects.toThrow(BadRequestError);

        expect(accessTokenIssuer.issueCalls).toHaveLength(0);
    });

    it('should refuse once the session is gone', async () => {
        const {
            service, 
            provider, 
            pendingLoginId, 
            sessionId, 
            sessionManager, 
            accessTokenIssuer,
        } = await begin();

        await sessionManager.revoke(sessionId);

        await expect(service.completeHandoff({ pendingLoginId, providerId: provider.id }))
            .rejects.toThrow(BadRequestError);

        expect(accessTokenIssuer.issueCalls).toHaveLength(0);
    });

    /**
     * The local second factor belongs to a local credential: an external
     * provider authenticated this login and is where MFA is enforced for it.
     * The completion therefore consults no authenticator at all.
     */
    it('should not consult the local second factor', async () => {
        const {
            service, 
            provider, 
            pendingLoginId, 
            accessTokenIssuer, 
            refreshTokenIssuer,
        } = await begin();

        const grant = await service.completeHandoff({ pendingLoginId, providerId: provider.id });

        expect(grant.access_token).toBeTruthy();
        expect(accessTokenIssuer.issueCalls).toHaveLength(1);
        expect(refreshTokenIssuer.issueCalls).toHaveLength(1);
    });
});
