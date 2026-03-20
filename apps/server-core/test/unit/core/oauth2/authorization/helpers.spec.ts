/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { buildOAuth2TokenHash } from '../../../../../src/core/oauth2/authorization/helpers.ts';

describe('buildOAuth2TokenHash', () => {
    it('should produce a base64url string of 22 characters (128 bits)', async () => {
        const hash = await buildOAuth2TokenHash('some-access-token-value');

        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(22);
        expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should produce different hashes for different inputs', async () => {
        const hash1 = await buildOAuth2TokenHash('token-a');
        const hash2 = await buildOAuth2TokenHash('token-b');

        expect(hash1).not.toBe(hash2);
    });

    it('should produce the same hash for the same input', async () => {
        const hash1 = await buildOAuth2TokenHash('deterministic-token');
        const hash2 = await buildOAuth2TokenHash('deterministic-token');

        expect(hash1).toBe(hash2);
    });
});
