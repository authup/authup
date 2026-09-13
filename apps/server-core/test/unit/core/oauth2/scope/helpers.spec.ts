/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { describe, expect, it } from 'vitest';
import { resolveGrantedScope } from '../../../../../src/core/oauth2/scope/helpers.ts';

describe('resolveGrantedScope', () => {
    const scopeNames = [ScopeName.OPEN_ID, ScopeName.EMAIL];

    it('should grant every bound scope when none is requested', () => {
        expect(resolveGrantedScope(scopeNames)).toBe('openid email');
        expect(resolveGrantedScope(scopeNames, null)).toBe('openid email');
        expect(resolveGrantedScope(scopeNames, '')).toBe('openid email');
    });

    it('should keep a requested subset verbatim', () => {
        expect(resolveGrantedScope(scopeNames, 'openid')).toBe('openid');
        expect(resolveGrantedScope(scopeNames, 'email openid')).toBe('email openid');
    });

    it('should reject excess scope instead of clipping it', () => {
        expect(() => resolveGrantedScope(scopeNames, 'openid profile'))
            .toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_SCOPE_INSUFFICIENT }));
    });

    it('should let a request carrying global bypass the bound set', () => {
        expect(resolveGrantedScope(scopeNames, 'global profile')).toBe('global profile');
    });
});
