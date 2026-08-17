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
    User,
} from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { OAuth2ErrorCode, OAuth2RequestError } from '@authup/specs';
import { InternalError } from '@authup/errors';
import { describe, expect, it } from 'vitest';
import { OAuth2FederatedLoginService } from '../../../../../src/core/oauth2/federated-login/module.ts';
import { OAuth2FederatedLoginRefusal } from '../../../../../src/core/oauth2/federated-login/types.ts';
import type {
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
} from '../../../../../src/core/oauth2/authorization/index.ts';
import type { IOAuth2AccessPolicyEvaluator } from '../../../../../src/core/oauth2/access-policy/index.ts';
import type { IIdentityProviderAccountManager } from '../../../../../src/core/identity/provider/account/types.ts';
import { FakeRealmRepository } from '../../entities/realm/fake-repository.ts';
import { FakeCodeIssuer } from './fake-code-issuer.ts';
import { FakeVerifier } from './fake-verifier.ts';

const REDIRECT_URI = 'https://app.example.com/callback';

const codeRequest = {
    response_type: 'code',
    client_id: randomUUID(),
    redirect_uri: REDIRECT_URI,
    state: 'state-1',
} as OAuth2AuthorizationCodeRequest;

function createProvider(overrides: Partial<OAuth2IdentityProvider> = {}) : OAuth2IdentityProvider {
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
    codeIssuer?: IOAuth2AuthorizationCodeIssuer,
    user?: User,
    accessPolicyEvaluator?: IOAuth2AccessPolicyEvaluator,
    authenticate?: () => Promise<User>,
} = {}) {
    const codeIssuer = options.codeIssuer ?? new FakeCodeIssuer();
    const service = new OAuth2FederatedLoginService({
        options: { baseURL: 'https://idp.example.com/' },
        accountManager: {} as IIdentityProviderAccountManager,
        realmRepository: new FakeRealmRepository(),
        codeRequestVerifier: options.verifier ?? new FakeVerifier({}),
        codeIssuer,
        accessPolicyEvaluator: options.accessPolicyEvaluator,
        // the seam that keeps the ladder testable: no external provider is
        // contacted, so every branch below runs without a network stub
        authenticatorFactory: () => ({
            authenticate: options.authenticate ??
                (async () => options.user ?? createUser()),
        } as any),
    });

    return { service, codeIssuer };
}

describe('core/oauth2/federated-login — OAuth2FederatedLoginService', () => {
    it('should issue a code bound to the relying party', async () => {
        const { service, codeIssuer } = buildService();

        const result = await service.complete({
            provider: createProvider(),
            codeRequest,
            code: 'provider-code',
        });

        expect(result.kind).toEqual('issued');
        if (result.kind !== 'issued') {
            return;
        }

        expect(result.redirectUri).toEqual(REDIRECT_URI);
        expect(result.code).toEqual('authorization-code-1');
        expect(result.state).toEqual('state-1');
        // the WHOLE verified request reaches the issuer, never a subset
        expect((codeIssuer as FakeCodeIssuer).issued[0]).toEqual(codeRequest);
    });

    it('should refuse a provider and client realm mismatch', async () => {
        const { service } = buildService();

        await expect(service.complete({
            provider: createProvider({ realmId: randomUUID() }),
            codeRequest: { ...codeRequest, realm_id: randomUUID() },
            code: 'provider-code',
        })).rejects.toThrow(OAuth2RequestError);
    });

    it('should refuse without a marker when the code request no longer verifies', async () => {
        const verifier = new FakeVerifier(OAuth2RequestError.malformed('client is gone'));
        const { service, codeIssuer } = buildService({ verifier });

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
        expect((codeIssuer as FakeCodeIssuer).issued).toHaveLength(0);
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
        // verifier both gap: the interstitial renders the target as an href
        // eslint-disable-next-line no-script-url -- the scheme under test
        const request = { ...codeRequest, redirect_uri: 'javascript:alert(1)' } as OAuth2AuthorizationCodeRequest;
        const { service, codeIssuer } = buildService();

        await expect(service.complete({
            provider: createProvider(),
            codeRequest: request,
            code: 'provider-code',
        })).rejects.toThrow(InternalError);

        expect((codeIssuer as FakeCodeIssuer).issued).toHaveLength(0);
    });

    it('should refuse a login once the provider was disabled', async () => {
        let authenticated = false;
        const { service, codeIssuer } = buildService({
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
        expect((codeIssuer as FakeCodeIssuer).issued).toHaveLength(0);
    });

    it('should refuse an inactive user', async () => {
        const { service, codeIssuer } = buildService({ user: createUser({ active: false }) });

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
        expect((codeIssuer as FakeCodeIssuer).issued).toHaveLength(0);
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
        const { service, codeIssuer } = buildService({
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
        expect((codeIssuer as FakeCodeIssuer).issued).toHaveLength(0);
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
