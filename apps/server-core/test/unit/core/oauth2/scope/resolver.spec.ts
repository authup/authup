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
        it('should dispatch to correct resolver per sub kind', () => {
            expect(resolver.resolveFor(OAuth2SubKind.CLIENT, ScopeName.IDENTITY)).toEqual(['name']);
            expect(resolver.resolveFor(OAuth2SubKind.ROBOT, ScopeName.IDENTITY)).toEqual(['name']);
            expect(resolver.resolveFor(OAuth2SubKind.USER, ScopeName.IDENTITY))
                .toEqual(expect.arrayContaining(['name', 'display_name', 'last_name', 'first_name']));
        });
    });

    describe('resolveForClient / resolveForRobot (identical maps)', () => {
        it.each([
            ['resolveForClient', (s: string | string[]) => resolver.resolveForClient(s)],
            ['resolveForRobot', (s: string | string[]) => resolver.resolveForRobot(s)],
        ] as const)('%s should resolve scope attributes', (_, resolve) => {
            expect(resolve(ScopeName.IDENTITY)).toEqual(['name']);
            expect(resolve(ScopeName.OPEN_ID)).toEqual(expect.arrayContaining(['name', 'display_name', 'updated_at', 'active']));
            expect(resolve(ScopeName.GLOBAL)).toEqual(expect.arrayContaining(['name', 'display_name', 'updated_at', 'active']));
            expect(resolve('unknown-scope')).toEqual([]);
        });
    });

    describe('resolveForUser', () => {
        it('should resolve per-scope attributes', () => {
            expect(resolver.resolveForUser(ScopeName.IDENTITY))
                .toEqual(expect.arrayContaining(['name', 'display_name', 'last_name', 'first_name']));
            expect(resolver.resolveForUser(ScopeName.EMAIL)).toEqual(['email']);
            expect(resolver.resolveForUser(ScopeName.OPEN_ID))
                .toEqual(expect.arrayContaining(['name', 'updated_at', 'first_name', 'last_name', 'display_name', 'active', 'email']));
        });

        it('should resolve global scope to all attributes', () => {
            const result = resolver.resolveForUser(ScopeName.GLOBAL);
            expect(result).toEqual(expect.arrayContaining(
                ['name', 'display_name', 'last_name', 'first_name', 'email', 'updated_at', 'active'],
            ));
        });

        it('should skip unmapped scopes', () => {
            expect(resolver.resolveForUser('unknown-scope')).toEqual([]);
        });
    });

    describe('input handling', () => {
        it('should deduplicate attributes across multiple scopes', () => {
            const result = resolver.resolveForUser([ScopeName.IDENTITY, ScopeName.EMAIL, ScopeName.OPEN_ID]);
            expect(result).toEqual([...new Set(result)]);
        });

        it('should accept space-separated string input', () => {
            expect(resolver.resolveForClient('identity openid')).toEqual(expect.arrayContaining(['name']));
        });

        it('should accept array input', () => {
            expect(resolver.resolveForClient([ScopeName.IDENTITY])).toEqual(['name']);
        });
    });
});
