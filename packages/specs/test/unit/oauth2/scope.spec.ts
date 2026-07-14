/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { mergeOAuth2Scopes, splitOAuth2Scope, unwrapOAuth2Scope } from '../../../src';

describe('src/oauth2/scope/helpers', () => {
    it('should split scopes preserving case', () => {
        expect(splitOAuth2Scope('openid  User.Read')).toEqual(['openid', 'User.Read']);
        expect(splitOAuth2Scope(null, ['openid'], 'profile,email'))
            .toEqual(['openid', 'profile', 'email']);
        expect(splitOAuth2Scope(undefined, '')).toEqual([]);
    });

    it('should split array elements like string input', () => {
        expect(splitOAuth2Scope(['openid profile', 'email'])).toEqual(['openid', 'profile', 'email']);
    });

    it('should merge scopes with first occurrence winning', () => {
        expect(mergeOAuth2Scopes('openid profile email', 'openid custom'))
            .toEqual('openid profile email custom');
    });

    it('should preserve case', () => {
        expect(mergeOAuth2Scopes('openid', 'User.Read'))
            .toEqual('openid User.Read');
    });

    it('should ignore empty input', () => {
        expect(mergeOAuth2Scopes('openid profile', null, undefined, ''))
            .toEqual('openid profile');
    });

    it('should accept arrays and comma separated input', () => {
        expect(mergeOAuth2Scopes(['openid', 'profile'], 'email,custom'))
            .toEqual('openid profile email custom');
    });

    it('should return an empty string without input', () => {
        expect(mergeOAuth2Scopes()).toEqual('');
    });

    // unwrapOAuth2Scope is the shared consent tokenizer (plan 055): both the
    // server's record/covering paths and the kit's covering probe normalize
    // through it — these edges pin the contract the covering rule depends on.
    describe('unwrapOAuth2Scope', () => {
        it('should lowercase mixed-case tokens', () => {
            expect(unwrapOAuth2Scope('Global OpenID')).toEqual(['global', 'openid']);
        });

        it('should split on commas like whitespace', () => {
            expect(unwrapOAuth2Scope('global,openid')).toEqual(['global', 'openid']);
        });

        it('should emit an empty token on adjacent comma+space separators (consumers must drop it)', () => {
            expect(unwrapOAuth2Scope('global, openid')).toEqual(['global', '', 'openid']);
        });

        it('should flatten arrays, tokenizing and lowercasing every element', () => {
            expect(unwrapOAuth2Scope(['Email profile', 'ADMIN'])).toEqual(['email', 'profile', 'admin']);
        });

        it('should return an empty list for an empty array', () => {
            expect(unwrapOAuth2Scope([])).toEqual([]);
        });

        it('should emit a single empty token for an empty string (consumers must drop it)', () => {
            expect(unwrapOAuth2Scope('')).toEqual(['']);
        });
    });
});
