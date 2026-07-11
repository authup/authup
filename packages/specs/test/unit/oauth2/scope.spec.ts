/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { mergeOAuth2Scopes, splitOAuth2Scope } from '../../../src';

describe('src/oauth2/scope/helpers', () => {
    it('should split scopes preserving case', () => {
        expect(splitOAuth2Scope('openid  User.Read')).toEqual(['openid', 'User.Read']);
        expect(splitOAuth2Scope(null, ['openid'], 'profile,email'))
            .toEqual(['openid', 'profile', 'email']);
        expect(splitOAuth2Scope(undefined, '')).toEqual([]);
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
});
