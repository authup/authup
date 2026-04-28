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
        const entity = {
            id: randomUUID(),
            active: true,
            is_confidential: false,
            ...client,
        } as Client;
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
            await expect(
                verifier.verify({
                    client_id: 'unknown',
                    response_type: OAuth2AuthorizationResponseType.CODE,
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_CLIENT_INVALID }));
        });

        it('should throw clientInactive when the client is inactive', async () => {
            const client = clientRepository.seed({ active: false, is_confidential: true });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    state: 's',
                }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_CLIENT_INVALID }));
        });

        it('should reject public clients without PKCE for the code flow', async () => {
            const client = clientRepository.seed({ is_confidential: false });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    state: 's',
                }),
            ).rejects.toThrow(/PKCE code_challenge is required/);
        });

        it('should reject public clients without state for the code flow', async () => {
            const client = clientRepository.seed({ is_confidential: false });
            await expect(
                verifier.verify({
                    client_id: client.id,
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    code_challenge: 'challenge',
                }),
            ).rejects.toThrow(/state is required for public clients/);
        });

        it('should accept public clients with both PKCE and state for the code flow', async () => {
            const client = clientRepository.seed({ is_confidential: false });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
                code_challenge: 'challenge',
                state: 's',
            });
            expect(result.client.id).toBe(client.id);
        });

        it('should not require state for confidential clients', async () => {
            const client = clientRepository.seed({ is_confidential: true });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.CODE,
            });
            expect(result.client.id).toBe(client.id);
        });

        it('should not require state for public clients in implicit flow', async () => {
            const client = clientRepository.seed({ is_confidential: false });
            const result = await verifier.verify({
                client_id: client.id,
                response_type: OAuth2AuthorizationResponseType.TOKEN,
            });
            expect(result.client.id).toBe(client.id);
        });
    });
});
