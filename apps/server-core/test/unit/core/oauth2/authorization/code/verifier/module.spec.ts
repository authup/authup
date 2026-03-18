/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import { OAuth2AuthorizationCodeChallengeMethod, OAuth2Error } from '@authup/specs';
import {
    beforeEach, describe, expect, it,
} from 'vitest';
import { buildOAuth2CodeChallenge } from '../../../../../../../src/core/oauth2/authorization/helpers.ts';
import { OAuth2AuthorizationCodeVerifier } from '../../../../../../../src/core/oauth2/authorization/code/verifier/module.ts';
import type { IOAuth2AuthorizationCodeRepository } from '../../../../../../../src/core/oauth2/authorization/code/repository/types.ts';

class FakeCodeRepository implements IOAuth2AuthorizationCodeRepository {
    private store = new Map<string, OAuth2AuthorizationCode>();

    seed(code: Partial<OAuth2AuthorizationCode>): OAuth2AuthorizationCode {
        const entity = { id: randomUUID(), ...code } as OAuth2AuthorizationCode;
        this.store.set(entity.id, entity);
        return entity;
    }

    async findOneById(id: string): Promise<OAuth2AuthorizationCode | null> {
        return this.store.get(id) ?? null;
    }

    async removeById(id: string): Promise<void> {
        this.store.delete(id);
    }

    async remove(entity: OAuth2AuthorizationCode): Promise<void> {
        this.store.delete(entity.id);
    }

    async save(): Promise<OAuth2AuthorizationCode> {
        throw new Error('not implemented');
    }

    has(id: string): boolean {
        return this.store.has(id);
    }
}

describe('OAuth2AuthorizationCodeVerifier', () => {
    let repository: FakeCodeRepository;
    let verifier: OAuth2AuthorizationCodeVerifier;

    beforeEach(() => {
        repository = new FakeCodeRepository();
        verifier = new OAuth2AuthorizationCodeVerifier(repository);
    });

    describe('verify', () => {
        it('should verify a valid code without PKCE or redirect_uri', async () => {
            const code = repository.seed({
                client_id: 'client-1',
                scope: 'openid',
            });
            const result = await verifier.verify(code.id, {});
            expect(result.id).toBe(code.id);
        });

        it('should throw for non-existent code', async () => {
            await expect(
                verifier.verify('non-existent', {}),
            ).rejects.toThrow(OAuth2Error);
        });

        it('should verify redirect_uri when code has one', async () => {
            const code = repository.seed({
                redirect_uri: 'https://example.com/callback',
            });
            const result = await verifier.verify(code.id, {
                redirectUri: 'https://example.com/callback',
            });
            expect(result.id).toBe(code.id);
        });

        it('should throw when redirect_uri does not match', async () => {
            const code = repository.seed({
                redirect_uri: 'https://example.com/callback',
            });
            await expect(
                verifier.verify(code.id, {
                    redirectUri: 'https://other.com/callback',
                }),
            ).rejects.toThrow(OAuth2Error);
        });

        it('should throw when redirect_uri missing but code has one', async () => {
            const code = repository.seed({
                redirect_uri: 'https://example.com/callback',
            });
            await expect(
                verifier.verify(code.id, {}),
            ).rejects.toThrow(OAuth2Error);
        });

        it('should verify PKCE plain challenge', async () => {
            const codeVerifier = 'my-plain-verifier';
            const code = repository.seed({
                code_challenge: codeVerifier,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.PLAIN,
            });
            const result = await verifier.verify(code.id, { codeVerifier });
            expect(result.id).toBe(code.id);
        });

        it('should throw when PKCE plain verifier does not match', async () => {
            const code = repository.seed({
                code_challenge: 'correct-verifier',
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.PLAIN,
            });
            await expect(
                verifier.verify(code.id, { codeVerifier: 'wrong-verifier' }),
            ).rejects.toThrow(OAuth2Error);
        });

        it('should verify PKCE S256 challenge', async () => {
            const codeVerifier = 'my-s256-verifier';
            const challenge = await buildOAuth2CodeChallenge(codeVerifier);
            const code = repository.seed({
                code_challenge: challenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            });
            const result = await verifier.verify(code.id, { codeVerifier });
            expect(result.id).toBe(code.id);
        });

        it('should throw when PKCE S256 verifier does not match', async () => {
            const challenge = await buildOAuth2CodeChallenge('correct-verifier');
            const code = repository.seed({
                code_challenge: challenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            });
            await expect(
                verifier.verify(code.id, { codeVerifier: 'wrong-verifier' }),
            ).rejects.toThrow(OAuth2Error);
        });

        it('should throw when code_verifier missing for S256 challenge', async () => {
            const challenge = await buildOAuth2CodeChallenge('verifier');
            const code = repository.seed({
                code_challenge: challenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            });
            await expect(
                verifier.verify(code.id, {}),
            ).rejects.toThrow(OAuth2Error);
        });
    });

    describe('remove', () => {
        it('should remove code by entity', async () => {
            const code = repository.seed({ client_id: 'c' });
            await verifier.remove(code);
            expect(repository.has(code.id)).toBe(false);
        });
    });

    describe('removeById', () => {
        it('should remove code by id', async () => {
            const code = repository.seed({ client_id: 'c' });
            await verifier.removeById(code.id);
            expect(repository.has(code.id)).toBe(false);
        });
    });
});
