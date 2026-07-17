/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { buildEntityDiff } from '../../../../../src/core/entities/event/diff.ts';

// Plan 073: the timestamp-drop heuristic must match the camelCase entity
// properties (`At` suffix) while keeping the legacy `_at` check as defense
// in depth, and the secret denylist regex must still catch camelCase names.
describe('buildEntityDiff (camelCase At-suffix heuristic, plan 073)', () => {
    it.each([
        ['createdAt'],
        ['updatedAt'],
        ['expiresAt'],
        ['mfaAt'],
        ['refreshedAt'],
    ])('drops the camelCase timestamp key %s', (key) => {
        expect(buildEntityDiff({ [key]: '2026-01-02' }, { [key]: '2026-01-01' })).toEqual({});
    });

    it.each([
        ['created_at'],
        ['updated_at'],
        ['expires_at'],
        ['mfa_at'],
    ])('still drops the legacy snake timestamp key %s (defense in depth)', (key) => {
        expect(buildEntityDiff({ [key]: '2026-01-02' }, { [key]: '2026-01-01' })).toEqual({});
    });

    it.each([
        ['secretHashed'],
        ['secretEncrypted'],
        ['resetHash'],
        ['activateHash'],
        ['clientSecret'],
        ['refreshTokenId'],
    ])('drops the camelCase secret-denylisted key %s', (key) => {
        const diff = buildEntityDiff({ [key]: 'leaked' }, { [key]: 'previous' });

        expect(diff).toEqual({});
        expect(JSON.stringify(diff)).not.toContain('leaked');
    });

    it.each([
        ['format'],
        ['chat'],
        ['habitat'],
    ])('keeps a non-timestamp key ending in literal "at" (%s)', (key) => {
        expect(buildEntityDiff({ [key]: 'next' }, { [key]: 'previous' }))
            .toEqual({ [key]: { next: 'next', previous: 'previous' } });
    });

    it('diffs a camelCase entity shape down to the changed non-timestamp scalars', () => {
        const diff = buildEntityDiff(
            {
                subKind: 'user',
                ipAddress: '2001:db8::2',
                mfaAt: '2026-01-02T00:00:00.000Z',
                createdAt: '2026-01-02T00:00:00.000Z',
                secretHashed: true,
            },
            {
                subKind: 'user',
                ipAddress: '2001:db8::1',
                mfaAt: null,
                createdAt: '2026-01-01T00:00:00.000Z',
                secretHashed: false,
            },
        );

        expect(diff).toEqual({ ipAddress: { next: '2001:db8::2', previous: '2001:db8::1' } });
    });
});
