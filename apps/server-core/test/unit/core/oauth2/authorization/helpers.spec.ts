/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createHash } from 'node:crypto';
import { ErrorCode } from '@authup/errors';
import { JWTAlgorithm } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { buildOAuth2TokenHash } from '../../../../../src/core/oauth2/authorization/helpers.ts';

// OIDC Core §3.1.3.6 reference: base64url of the LEFT HALF of the digest
// matching the JWS alg — computed independently of the implementation.
const expectedHash = (value: string, digest: string, halfLength: number) => createHash(digest)
    .update(value)
    .digest()
    .subarray(0, halfLength)
    .toString('base64url');

describe('buildOAuth2TokenHash', () => {
    it('should produce the SHA-256 left half for a *S256 alg (22 base64url chars)', async () => {
        const hash = await buildOAuth2TokenHash('some-access-token-value', JWTAlgorithm.RS256);

        expect(hash).toEqual(expectedHash('some-access-token-value', 'sha256', 16));
        expect(hash.length).toBe(22);
        expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should produce the SHA-384 left half for a *S384 alg (24 bytes)', async () => {
        const hash = await buildOAuth2TokenHash('some-access-token-value', JWTAlgorithm.RS384);

        expect(hash).toEqual(expectedHash('some-access-token-value', 'sha384', 24));
        expect(hash.length).toBe(32);
    });

    it.each([
        [JWTAlgorithm.RS512],
        [JWTAlgorithm.ES512],
    ])('should produce the SHA-512 left half for %s (32 bytes)', async (alg) => {
        const hash = await buildOAuth2TokenHash('some-access-token-value', alg);

        expect(hash).toEqual(expectedHash('some-access-token-value', 'sha512', 32));
        expect(hash.length).toBe(43);
    });

    it('should derive SHA-256 for a missing alg (legacy key row, signer *256 default)', async () => {
        // signature_algorithm is a nullable legacy column — a key without a
        // persisted alg signs with the signer's *256 default, so the hash
        // must follow SHA-256 instead of raising a TypeError.
        const hash = await buildOAuth2TokenHash('some-access-token-value', null);

        expect(hash).toEqual(expectedHash('some-access-token-value', 'sha256', 16));
    });

    it('should fail loud on an unrecognized alg, never silently default', async () => {
        // runtime junk from an untyped source (the key column is persisted
        // data) must throw — a silent SHA-256 fallback would mint a hash no
        // conforming verifier accepts.
        // @ts-expect-error deliberately out-of-enum runtime input
        await expect(buildOAuth2TokenHash('value', 'none')).rejects.toThrow(
            expect.objectContaining({ code: ErrorCode.JWT_INVALID }),
        );
    });

    it('should produce different hashes for different inputs', async () => {
        const hash1 = await buildOAuth2TokenHash('token-a', JWTAlgorithm.RS256);
        const hash2 = await buildOAuth2TokenHash('token-b', JWTAlgorithm.RS256);

        expect(hash1).not.toBe(hash2);
    });

    it('should produce the same hash for the same input', async () => {
        const hash1 = await buildOAuth2TokenHash('deterministic-token', JWTAlgorithm.RS256);
        const hash2 = await buildOAuth2TokenHash('deterministic-token', JWTAlgorithm.RS256);

        expect(hash1).toBe(hash2);
    });
});
