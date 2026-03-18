/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { OAuth2ScopeAttributesResolver } from '../../../../../src/core/oauth2/scope/resolver.ts';

describe('OAuth2ScopeAttributesResolver', () => {
    const resolver = new OAuth2ScopeAttributesResolver();

    describe('resolveFor', () => {
        it('should dispatch to client resolver for CLIENT type', () => {
            const result = resolver.resolveFor(OAuth2SubKind.CLIENT, ScopeName.IDENTITY);
            expect(result).toEqual(['name']);
        });

        it('should dispatch to robot resolver for ROBOT type', () => {
            const result = resolver.resolveFor(OAuth2SubKind.ROBOT, ScopeName.IDENTITY);
            expect(result).toEqual(['name']);
        });

        it('should dispatch to user resolver for USER type', () => {
            const result = resolver.resolveFor(OAuth2SubKind.USER, ScopeName.IDENTITY);
            expect(result).toEqual(expect.arrayContaining(['name', 'display_name', 'last_name', 'first_name']));
        });
    });

    describe('resolveForClient', () => {
        it('should resolve identity scope attributes', () => {
            const result = resolver.resolveForClient(ScopeName.IDENTITY);
            expect(result).toEqual(['name']);
        });

        it('should resolve openid scope attributes', () => {
            const result = resolver.resolveForClient(ScopeName.OPEN_ID);
            expect(result).toEqual(expect.arrayContaining(['name', 'display_name', 'updated_at', 'active']));
        });

        it('should resolve global scope to all attributes', () => {
            const result = resolver.resolveForClient(ScopeName.GLOBAL);
            expect(result).toEqual(expect.arrayContaining(['name', 'display_name', 'updated_at', 'active']));
        });

        it('should skip unmapped scopes', () => {
            const result = resolver.resolveForClient('unknown-scope');
            expect(result).toEqual([]);
        });

        it('should deduplicate attributes', () => {
            const result = resolver.resolveForClient([ScopeName.IDENTITY, ScopeName.OPEN_ID]);
            const unique = [...new Set(result)];
            expect(result).toEqual(unique);
        });

        it('should accept string input and unwrap', () => {
            const result = resolver.resolveForClient('identity openid');
            expect(result).toEqual(expect.arrayContaining(['name']));
        });

        it('should accept array input', () => {
            const result = resolver.resolveForClient([ScopeName.IDENTITY]);
            expect(result).toEqual(['name']);
        });
    });

    describe('resolveForRobot', () => {
        it('should resolve identity scope attributes', () => {
            const result = resolver.resolveForRobot(ScopeName.IDENTITY);
            expect(result).toEqual(['name']);
        });

        it('should resolve openid scope attributes', () => {
            const result = resolver.resolveForRobot(ScopeName.OPEN_ID);
            expect(result).toEqual(expect.arrayContaining(['name', 'display_name', 'updated_at', 'active']));
        });

        it('should resolve global scope to all attributes', () => {
            const result = resolver.resolveForRobot(ScopeName.GLOBAL);
            expect(result).toEqual(expect.arrayContaining(['name', 'display_name', 'updated_at', 'active']));
        });

        it('should skip unmapped scopes', () => {
            const result = resolver.resolveForRobot('email');
            expect(result).toEqual([]);
        });
    });

    describe('resolveForUser', () => {
        it('should resolve identity scope attributes', () => {
            const result = resolver.resolveForUser(ScopeName.IDENTITY);
            expect(result).toEqual(expect.arrayContaining(['name', 'display_name', 'last_name', 'first_name']));
        });

        it('should resolve email scope attributes', () => {
            const result = resolver.resolveForUser(ScopeName.EMAIL);
            expect(result).toEqual(['email']);
        });

        it('should resolve openid scope attributes', () => {
            const result = resolver.resolveForUser(ScopeName.OPEN_ID);
            expect(result).toEqual(expect.arrayContaining(['name', 'updated_at', 'first_name', 'last_name', 'display_name', 'active', 'email']));
        });

        it('should resolve global scope to all attributes', () => {
            const result = resolver.resolveForUser(ScopeName.GLOBAL);
            const allAttributes = ['name', 'display_name', 'last_name', 'first_name', 'email', 'updated_at', 'active'];
            expect(result).toEqual(expect.arrayContaining(allAttributes));
        });

        it('should deduplicate across multiple scopes', () => {
            const result = resolver.resolveForUser([ScopeName.IDENTITY, ScopeName.EMAIL, ScopeName.OPEN_ID]);
            const unique = [...new Set(result)];
            expect(result).toEqual(unique);
        });

        it('should skip unmapped scopes', () => {
            const result = resolver.resolveForUser('unknown-scope');
            expect(result).toEqual([]);
        });
    });
});
