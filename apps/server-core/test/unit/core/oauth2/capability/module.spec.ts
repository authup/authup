/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isOAuth2RequestError } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import {
    OAUTH2_CAPABILITY_MAX_BYTES,
    OAUTH2_CAPABILITY_MAX_ENTRIES,
    parseOAuth2Capabilities,
} from '../../../../../src/core/oauth2/capability/index.ts';

function expectRefused(input: string, message?: RegExp) {
    let error : unknown;

    try {
        parseOAuth2Capabilities(input);
    } catch (e) {
        error = e;
    }

    expect(isOAuth2RequestError(error)).toBe(true);

    if (message) {
        expect((error as Error).message).toMatch(message);
    }
}

describe('parseOAuth2Capabilities', () => {
    it('parses type, id, actions and keeps the requested form', () => {
        expect(parseOAuth2Capabilities('bucket:B-1.a_b:read,write')).toEqual([{
            type: 'bucket',
            id: 'B-1.a_b',
            actions: ['read', 'write'],
            value: 'bucket:B-1.a_b:read,write',
        }]);
    });

    it('parses several space-separated entries in order', () => {
        const output = parseOAuth2Capabilities('bucket:a:read bucket-file:b:read');

        expect(output.map((entry) => entry.value)).toEqual(['bucket:a:read', 'bucket-file:b:read']);
    });

    it.each([
        ['a type of 64 characters', `${'a'.repeat(64)}:id:read`],
        ['an id of 128 characters', `bucket:${'a'.repeat(128)}:read`],
        ['an action of 32 characters', `bucket:id:${'a'.repeat(32)}`],
    ])('accepts %s', (_label, entry) => {
        expect(parseOAuth2Capabilities(entry)).toHaveLength(1);
    });

    it.each([
        ['a missing segment', 'bucket:id'],
        ['an additional segment', 'bucket:id:read:more'],
        ['a type starting with a digit', '1bucket:id:read'],
        ['an upper-case type', 'Bucket:id:read'],
        ['an empty type', ':id:read'],
        ['a type of 65 characters', `${'a'.repeat(65)}:id:read`],
        ['an empty id', 'bucket::read'],
        ['an id with a slash', 'bucket:a/b:read'],
        ['an id of 129 characters', `bucket:${'a'.repeat(129)}:read`],
        ['no actions', 'bucket:id:'],
        ['an empty action', 'bucket:id:read,'],
        ['an action starting with a digit', 'bucket:id:1read'],
        ['an upper-case action', 'bucket:id:Read'],
        ['an action of 33 characters', `bucket:id:${'a'.repeat(33)}`],
    ])('refuses %s', (_label, entry) => {
        expectRefused(entry);
    });

    it('refuses a duplicate action within an entry', () => {
        expectRefused('bucket:id:read,read', /repeats an action/);
    });

    it('refuses a duplicate entry', () => {
        expectRefused('bucket:id:read bucket:other:read bucket:id:read', /repeats an entry/);
    });

    it.each([
        ['a double space', 'bucket:a:read  bucket:b:read'],
        ['a leading space', ' bucket:a:read'],
        ['a trailing space', 'bucket:a:read '],
        ['a tab as separator', 'bucket:a:read\tbucket:b:read'],
        ['a newline after an entry', 'bucket:a:read\n'],
    ])('refuses %s', (_label, input) => {
        expectRefused(input);
    });

    it('accepts the maximum number of entries and refuses one more', () => {
        const entries = Array.from({ length: OAUTH2_CAPABILITY_MAX_ENTRIES }, (_, index) => `bucket:${index}:read`);

        expect(parseOAuth2Capabilities(entries.join(' '))).toHaveLength(OAUTH2_CAPABILITY_MAX_ENTRIES);

        expectRefused([...entries, 'bucket:one-more:read'].join(' '), /32 entries/);
    });

    it('accepts exactly the byte limit and refuses one byte more', () => {
        const actions = Array.from({ length: 127 }, (_, index) => `a${String(index).padStart(30, '0')}`);
        const build = (lastAction: string) => `bucket:id:${[...actions, lastAction].join(',')}`;

        const atLimit = build('z'.repeat(22));

        expect(new TextEncoder().encode(atLimit).length).toEqual(OAUTH2_CAPABILITY_MAX_BYTES);
        expect(parseOAuth2Capabilities(atLimit)).toHaveLength(1);

        expectRefused(build('z'.repeat(23)), /4096 bytes/);
    });

    it('measures the limit in bytes, not in characters', () => {
        // 1366 characters but 4098 bytes in utf-8: below the limit counted in
        // characters, above it counted in bytes
        const input = '€'.repeat(1366);

        expect(input.length).toBeLessThan(OAUTH2_CAPABILITY_MAX_BYTES);
        expectRefused(input, /4096 bytes/);
    });
});
