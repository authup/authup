/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { buildEntityDiff } from '../../../../../src/core/entities/event/diff.ts';

describe('buildEntityDiff', () => {
    it('includes a changed scalar with next/previous', () => {
        const diff = buildEntityDiff(
            { description: 'after', name: 'same' },
            { description: 'before', name: 'same' },
        );

        expect(diff).toEqual({ description: { next: 'after', previous: 'before' } });
    });

    it.each([
        ['string', 'value', 'value'],
        ['number', 42, 42],
        ['boolean', true, true],
        ['null', null, null],
    ])('skips an unchanged %s value', (_label, next, previous) => {
        expect(buildEntityDiff({ key: next }, { key: previous })).toEqual({});
    });

    it.each([
        ['string -> string', 'b', 'a'],
        ['number -> number', 2, 1],
        ['boolean flip', false, true],
        ['null -> string', 'set', null],
        ['string -> null', null, 'unset'],
    ])('includes a changed scalar pair (%s)', (_label, next, previous) => {
        expect(buildEntityDiff({ key: next }, { key: previous })).toEqual({ key: { next, previous } });
    });

    it.each([
        ['createdAt'],
        ['updatedAt'],
        ['expiresAt'],
    ])('skips the timestamp key %s', (key) => {
        expect(buildEntityDiff({ [key]: 'b' }, { [key]: 'a' })).toEqual({});
    });

    it.each([
        ['password'],
        ['secret'],
        ['clientSecret'],
        ['secretHashed'],
        ['hash'],
        ['token'],
        ['refreshTokenId'],
        ['credential'],
        ['Password'],
        ['SECRET_ENCRYPTED'],
    ])('skips the secret-denylisted key %s', (key) => {
        const diff = buildEntityDiff({ [key]: 'leaked' }, { [key]: 'previous' });

        expect(diff).toEqual({});
        expect(JSON.stringify(diff)).not.toContain('leaked');
    });

    it.each([
        ['object', { nested: 'value' }, 'scalar'],
        ['array', ['value'], 'scalar'],
        ['function', () => 'value', 'scalar'],
        ['undefined', undefined, 'scalar'],
        ['object on the previous side', 'scalar', { nested: 'value' }],
        ['array on the previous side', 'scalar', ['value']],
        ['undefined on the previous side', 'scalar', undefined],
    ])('skips a key with a non-scalar %s', (_label, next, previous) => {
        expect(buildEntityDiff({ key: next }, { key: previous })).toEqual({});
    });

    it('skips a key present on only one side (both sides must be scalar)', () => {
        expect(buildEntityDiff({ added: 'value' }, {})).toEqual({});
        expect(buildEntityDiff({}, { removed: 'value' })).toEqual({});
    });

    it('truncates string values to 512 characters', () => {
        const diff = buildEntityDiff(
            { description: 'a'.repeat(600) },
            { description: 'b'.repeat(600) },
        );

        expect(diff.description.next).toEqual('a'.repeat(512));
        expect(diff.description.previous).toEqual('b'.repeat(512));
    });

    it('keeps a string of exactly 512 characters untouched', () => {
        const diff = buildEntityDiff(
            { description: 'a'.repeat(512) },
            { description: 'b' },
        );

        expect(diff.description.next).toEqual('a'.repeat(512));
    });

    it('handles multiple keys with mixed rules in one pass', () => {
        const diff = buildEntityDiff(
            {
                name: 'next-name',
                description: 'same',
                secret: 'new-secret',
                updatedAt: '2026-01-02',
                meta: { nested: true },
                active: false,
            },
            {
                name: 'previous-name',
                description: 'same',
                secret: 'old-secret',
                updatedAt: '2026-01-01',
                meta: { nested: false },
                active: true,
            },
        );

        expect(diff).toEqual({
            name: { next: 'next-name', previous: 'previous-name' },
            active: { next: false, previous: true },
        });
    });
});
