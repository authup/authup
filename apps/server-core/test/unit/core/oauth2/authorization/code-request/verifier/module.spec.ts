/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, Scope } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2AuthorizationCodeRequestVerifier } from '../../../../../../../src/core/oauth2/authorization/code-request/verifier/module.ts';
import type { IOAuth2ClientRepository } from '../../../../../../../src/core/oauth2/client/types.ts';
import type { IOAuth2ScopeRepository } from '../../../../../../../src/core/oauth2/scope/types.ts';

class FakeClientRepository implements IOAuth2ClientRepository {
    private clients: Client[] = [];

    seed(client: Partial<Client>): Client {
        const now = new Date().toISOString();
        const realmId = randomUUID();
        const entity: Client = {
            id: randomUUID(),
            active: true,
            builtIn: false,
            authMethod: 'none',
            tokenBindingMethod: 'none',
            name: 'client',
            displayName: null,
            description: null,
            secret: null,
            secretHashed: false,
            secretEncrypted: false,
            // authorize-capable clients always carry a registered pattern —
            // the verifier rejects pattern-less clients outright (OAuth 2.1)
            redirectUri: 'https://app.example.com/**',
            postLogoutRedirectUri: null,
            grantTypes: null,
            scope: null,
            baseUrl: null,
            rootUrl: null,
            accessPolicyId: null,
            accessPolicy: null,
            createdAt: now,
            updatedAt: now,
            realmId,
            realm: {
                id: realmId,
                name: 'master',
                displayName: null,
                description: null,
                builtIn: true,
                createdAt: now,
                updatedAt: now,
            },
            ...client,
        };
        this.clients.push(entity);
        return entity;
    }

    async findOneByIdOrName(idOrName: string): Promise<Client | null> {
        return this.clients.find((c) => c.id === idOrName || c.name === idOrName) ?? null;
    }
}

const emptyScopeRepository: IOAuth2ScopeRepository = { findByClientId: async (): Promise<Scope[]> => [] };

describe('OAuth2AuthorizationCodeRequestVerifier', () => {
    let clientRepository: FakeClientRepository;
    let verifier: OAuth2AuthorizationCodeRequestVerifier;

    beforeEach(() => {
        clientRepository = new FakeClientRepository();
        verifier = new OAuth2AuthorizationCodeRequestVerifier({
            clientRepository,
            scopeRepository: emptyScopeRepository,
        });
    });

    describe('verify', () => {
        it('should throw clientInvalid when client_id is missing', async () => {
            await expect(
                verifier.verify({ response_type: OAuth2AuthorizationResponseType.CODE }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_CLIENT_INVALID }));
        });

        it('should throw clientInvalid when client cannot be found', async () => {
            // a UUID that resolves to nothing — a name would first trip the
            // realm-hint requirement below
            await expect(
                verifier.verify({
                    client_id: randomUUID(),
                    response_type: OAuth2AuthorizationResponseType.CODE,
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_CLIENT_INVALID }));
        });

        it('should throw requestInvalid when a name-identified client has no realm hint', async () => {
            // every realm has a built-in `web` client, so a name without a realm
            // is ambiguous — reject deterministically instead of matching an
            // arbitrary realm's client.
            await expect(
                verifier.verify({
                    client_id: 'web',
                    response_type: OAuth2AuthorizationResponseType.CODE,
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REQUEST_INVALID }));
        });

        it('should throw clientInactive when the client is inactive', async () => {
            const client = clientRepository.seed({
                active: false,
                authMethod: 'secret',
                tokenBindingMethod: 'none',
            });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    state: 's',
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_CLIENT_INVALID }));
        });

        it('should reject public clients without PKCE for the code flow', async () => {
            const client = clientRepository.seed({ authMethod: 'none', tokenBindingMethod: 'none' });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    state: 's',
                }),
            ).rejects.toThrow(/PKCE code_challenge is required/);
        });

        it('should reject public clients without state for the code flow', async () => {
            const client = clientRepository.seed({ authMethod: 'none', tokenBindingMethod: 'none' });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    code_challenge: 'challenge',
                }),
            ).rejects.toThrow(/state is required for public clients/);
        });

        it('should accept public clients with both PKCE and state for the code flow', async () => {
            const client = clientRepository.seed({ authMethod: 'none', tokenBindingMethod: 'none' });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
                code_challenge: 'challenge',
                state: 's',
            });
            expect(result.client.id).toBe(client.id);
        });

        it('should not require state for confidential clients', async () => {
            const client = clientRepository.seed({ authMethod: 'secret', tokenBindingMethod: 'none' });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
            });
            expect(result.client.id).toBe(client.id);
        });

        it('should require PKCE for public clients regardless of response_type (code-only pipeline)', async () => {
            const client = clientRepository.seed({ authMethod: 'none', tokenBindingMethod: 'none' });
            await expect(verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.TOKEN,
            })).rejects.toThrow();
        });

        it('should reject a client whose grant_types allowlist omits authorization_code', async () => {
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                grantTypes: 'client_credentials',
            });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_CLIENT_UNAUTHORIZED }));
        });

        it('should accept a client whose grant_types allowlist includes authorization_code', async () => {
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                grantTypes: 'authorization_code refresh_token',
            });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
            });
            expect(result.client.id).toBe(client.id);
        });

        it('should treat a null grant_types column as allow-all', async () => {
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                grantTypes: null,
            });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
            });
            expect(result.client.id).toBe(client.id);
        });

        it('should reject a pattern-less client outright (open-redirect guard, OAuth 2.1)', async () => {
            // A client with no registered redirect_uri pattern can never be
            // matched — the verifier must throw instead of issuing a code to
            // whatever redirect_uri the request carries.
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                redirectUri: null,
            });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    redirect_uri: 'https://attacker.example.com/callback',
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH }));
        });

        it('should reject a pattern-less client even without a request redirect_uri', async () => {
            // the reject is unconditional — the GET page render path (no
            // redirect_uri in the request) must not resolve such a client either
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                redirectUri: null,
            });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH }));
        });

        it('should flag redirectUriVerified=false when the request carries no redirect_uri', async () => {
            // the GET page render legitimately verifies without a redirect_uri —
            // it resolves, but consumers must NOT auto-redirect
            const client = clientRepository.seed({ authMethod: 'secret', tokenBindingMethod: 'none' });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
            });
            expect(result.client.id).toBe(client.id);
            expect(result.redirectUriVerified).toBe(false);
        });

        it('should flag redirectUriVerified=true when the redirect matches a registered pattern', async () => {
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                redirectUri: 'https://app.example.com/**',
            });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
                redirect_uri: 'https://app.example.com/callback',
            });
            expect(result.redirectUriVerified).toBe(true);
        });

        it('should accept a redirect matching a registered host wildcard', async () => {
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                redirectUri: 'https://*.example.com/**',
            });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
                redirect_uri: 'https://app.example.com/callback',
            });
            expect(result.redirectUriVerified).toBe(true);
        });

        it('should reject a redirect a registered host wildcard does not cover', async () => {
            // the wildcard never crosses a `/`, so it stays inside the host
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                redirectUri: 'https://*.example.com/**',
            });

            const candidates = [
                'https://app.example.com.evil.test/callback',
                'https://app.example.com@evil.test/callback',
                'https://app.example.com:8443/callback',
                'http://app.example.com/callback',
                // a path-less URI used to satisfy every pattern sharing its
                // literal prefix, which let any origin collect the code
                'https://attacker.test',
                'https://attacker.test?code=1',
            ];

            for (const redirectUri of candidates) {
                await expect(
                    verifier.verify({
                        client_id: client.id,
                        response_type: OAuth2AuthorizationResponseType.CODE,
                        redirect_uri: redirectUri,
                    }),
                ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH }));
            }
        });

        it('should reject a redirect whose authority terminator a host wildcard would absorb', async () => {
            // The matcher's only boundary is `/`, but a URL authority also ends
            // at `?`, `#` and `\`. Matched against the raw string, the wildcard
            // absorbs one of those and `.example.com` lands in the query or
            // fragment of a foreign origin, so the code would be issued to
            // https://evil.test. Canonicalizing the candidate first is what
            // stops it, which is why the verifier must not call isSimpleMatch.
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                redirectUri: 'https://*.example.com/**',
            });

            const candidates = [
                'https://evil.test?.example.com/callback',
                'https://evil.test#.example.com/callback',
                'https://evil.test\\.example.com/callback',
                'https://user@evil.test#.example.com/callback',
                'https://evil.test:8443#.example.com/callback',
            ];

            for (const redirectUri of candidates) {
                await expect(
                    verifier.verify({
                        client_id: client.id,
                        response_type: OAuth2AuthorizationResponseType.CODE,
                        redirect_uri: redirectUri,
                    }),
                ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH }));
            }
        });

        it('should reject a redirect that walks out of a path scoped pattern', async () => {
            // The authorized string has to be the string the browser navigates
            // to: `new URL(...)` collapses the dot segments, so without
            // canonicalization the target ends up outside the allowed prefix.
            const client = clientRepository.seed({
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                redirectUri: 'https://app.example.com/tenant-a/**',
            });

            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    redirect_uri: 'https://app.example.com/tenant-a/../tenant-b/callback',
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH }));
        });
    });
});
