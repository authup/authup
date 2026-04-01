/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import { OAuth2AuthorizationCodeChallengeMethod } from '@authup/specs';
import { ErrorCode } from '@authup/errors';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { buildOAuth2CodeChallenge } from '../../../../../../../src/core/oauth2/authorization/helpers.ts';
import { OAuth2AuthorizationCodeVerifier } from '../../../../../../../src/core/oauth2/authorization/code/verifier/module.ts';
import type { IOAuth2AuthorizationCodeRepository } from '../../../../../../../src/core/oauth2/authorization/code/repository/types.ts';

class FakeCodeRepository implements IOAuth2AuthorizationCodeRepository {
    private store = new Map<string, OAuth2AuthorizationCode>();

    seed(code: Partial<OAuth2AuthorizationCode>): OAuth2AuthorizationCode {
        const entity = {
            id: randomUUID(),
            ...code, 
        } as OAuth2AuthorizationCode;
        this.store.set(entity.id, entity);
        return entity;
    }

    async findOneById(id: string): Promise<OAuth2AuthorizationCode | null> {
        return this.store.get(id) ?? null;
    }

    async popOneById(id: string): Promise<OAuth2AuthorizationCode | null> {
        const entity = this.store.get(id) ?? null;
        if (entity) {
            this.store.delete(id);
        }
        return entity;
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

        it('should throw grantInvalid for non-existent code', async () => {
            await expect(
                verifier.verify('non-existent', {}),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
        });

        it('should verify redirect_uri when code has one', async () => {
            const code = repository.seed({ redirect_uri: 'https://example.com/callback' });
            const result = await verifier.verify(code.id, { redirectUri: 'https://example.com/callback' });
            expect(result.id).toBe(code.id);
        });

        it('should throw redirectUriMismatch when redirect_uri does not match', async () => {
            const code = repository.seed({ redirect_uri: 'https://example.com/callback' });
            await expect(
                verifier.verify(code.id, { redirectUri: 'https://other.com/callback' }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH }));
        });

        it('should throw redirectUriMismatch when redirect_uri missing but code has one', async () => {
            const code = repository.seed({ redirect_uri: 'https://example.com/callback' });
            await expect(
                verifier.verify(code.id, {}),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH }));
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

        it('should throw grantInvalid when PKCE plain verifier does not match', async () => {
            const code = repository.seed({
                code_challenge: 'correct-verifier',
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.PLAIN,
            });
            await expect(
                verifier.verify(code.id, { codeVerifier: 'wrong-verifier' }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
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

        it('should throw grantInvalid when PKCE S256 verifier does not match', async () => {
            const challenge = await buildOAuth2CodeChallenge('correct-verifier');
            const code = repository.seed({
                code_challenge: challenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            });
            await expect(
                verifier.verify(code.id, { codeVerifier: 'wrong-verifier' }),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
        });

        it('should throw grantInvalid when code_verifier missing for S256 challenge', async () => {
            const challenge = await buildOAuth2CodeChallenge('verifier');
            const code = repository.seed({
                code_challenge: challenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            });
            await expect(
                verifier.verify(code.id, {}),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
        });
    });

    describe('atomic consumption', () => {
        it('should consume code on verify (single-use)', async () => {
            const code = repository.seed({ client_id: 'c' });
            await verifier.verify(code.id, {});
            expect(repository.has(code.id)).toBe(false);
        });

        it('should reject second verify of same code', async () => {
            const code = repository.seed({ client_id: 'c' });
            await verifier.verify(code.id, {});
            await expect(
                verifier.verify(code.id, {}),
            ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
        });
    });
});
