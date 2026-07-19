/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    RealmScope,
    compareRealmScope,
    maxRealmScope,
    minRealmScope,
    normalizeRealmScope,
    realmScopeMatches,
} from '../../../src';

describe('src/permission/realm-scope', () => {
    describe('normalizeRealmScope', () => {
        it('coerces missing/unknown to own (fail-closed)', () => {
            expect(normalizeRealmScope(undefined)).toBe(RealmScope.OWN);
            expect(normalizeRealmScope(null)).toBe(RealmScope.OWN);
            expect(normalizeRealmScope('garbage' as any)).toBe(RealmScope.OWN);
            expect(normalizeRealmScope(RealmScope.OWN_OR_NULL)).toBe(RealmScope.OWN_OR_NULL);
            expect(normalizeRealmScope('any')).toBe(RealmScope.ANY);
            expect(normalizeRealmScope('none')).toBe(RealmScope.NONE);
        });
    });

    describe('ordering', () => {
        it('orders none < own < ownOrNull < any', () => {
            expect(compareRealmScope(RealmScope.NONE, RealmScope.OWN)).toBeLessThan(0);
            expect(compareRealmScope(RealmScope.OWN, RealmScope.OWN_OR_NULL)).toBeLessThan(0);
            expect(compareRealmScope(RealmScope.OWN_OR_NULL, RealmScope.ANY)).toBeLessThan(0);
            expect(compareRealmScope(RealmScope.ANY, RealmScope.OWN)).toBeGreaterThan(0);
            expect(compareRealmScope(RealmScope.OWN, RealmScope.OWN)).toBe(0);
        });

        it('maxRealmScope folds to most permissive, default own', () => {
            expect(maxRealmScope([])).toBe(RealmScope.OWN);
            expect(maxRealmScope([undefined, null])).toBe(RealmScope.OWN);
            expect(maxRealmScope([RealmScope.OWN, RealmScope.ANY, RealmScope.OWN_OR_NULL])).toBe(RealmScope.ANY);
            expect(maxRealmScope([RealmScope.OWN, RealmScope.OWN_OR_NULL])).toBe(RealmScope.OWN_OR_NULL);
        });

        it('minRealmScope caps to most restrictive', () => {
            expect(minRealmScope([RealmScope.ANY, RealmScope.OWN])).toBe(RealmScope.OWN);
            expect(minRealmScope([RealmScope.ANY, RealmScope.OWN_OR_NULL])).toBe(RealmScope.OWN_OR_NULL);
            expect(minRealmScope([undefined, RealmScope.ANY])).toBe(RealmScope.OWN);
        });
    });

    describe('realmScopeMatches', () => {
        const A = 'realm-a';
        const B = 'realm-b';

        it('any matches every resource realm, incl. null and other realms', () => {
            expect(realmScopeMatches(RealmScope.ANY, A, A)).toBe(true);
            expect(realmScopeMatches(RealmScope.ANY, B, A)).toBe(true);
            expect(realmScopeMatches(RealmScope.ANY, null, A)).toBe(true);
            // any even lets a realm-less actor through
            expect(realmScopeMatches(RealmScope.ANY, B, null)).toBe(true);
        });

        it('own matches only the actor own realm', () => {
            expect(realmScopeMatches(RealmScope.OWN, A, A)).toBe(true);
            expect(realmScopeMatches(RealmScope.OWN, B, A)).toBe(false);
            expect(realmScopeMatches(RealmScope.OWN, null, A)).toBe(false);
        });

        it('ownOrNull matches own realm and null/global', () => {
            expect(realmScopeMatches(RealmScope.OWN_OR_NULL, A, A)).toBe(true);
            expect(realmScopeMatches(RealmScope.OWN_OR_NULL, null, A)).toBe(true);
            expect(realmScopeMatches(RealmScope.OWN_OR_NULL, B, A)).toBe(false);
        });

        it('denies a realm-less actor under own / ownOrNull (no A=null === R=null leak)', () => {
            expect(realmScopeMatches(RealmScope.OWN, null, null)).toBe(false);
            expect(realmScopeMatches(RealmScope.OWN_OR_NULL, null, null)).toBe(false);
            expect(realmScopeMatches(RealmScope.OWN, A, null)).toBe(false);
            expect(realmScopeMatches(RealmScope.OWN_OR_NULL, A, null)).toBe(false);
        });

        it('matches the actor realm by name when supplied', () => {
            expect(realmScopeMatches(RealmScope.OWN, 'master', null, 'master')).toBe(true);
            expect(realmScopeMatches(RealmScope.OWN, 'master', null, 'other')).toBe(false);
        });

        it('a missing/undefined scope coerces to own (fail-closed)', () => {
            expect(realmScopeMatches(undefined, B, A)).toBe(false);
            expect(realmScopeMatches(undefined, A, A)).toBe(true);
        });

        it('none never matches', () => {
            expect(realmScopeMatches(RealmScope.NONE, A, A)).toBe(false);
            expect(realmScopeMatches(RealmScope.NONE, null, A)).toBe(false);
        });

        describe('multi-realm resource (realmId array)', () => {
            it('requires the scope to reach EVERY listed realm (unanimous, fail-closed)', () => {
                // own actor in A: [A] reachable, [A,B] not (B out of reach)
                expect(realmScopeMatches(RealmScope.OWN, [A], A)).toBe(true);
                expect(realmScopeMatches(RealmScope.OWN, [A, B], A)).toBe(false);
                // any reaches all
                expect(realmScopeMatches(RealmScope.ANY, [A, B], A)).toBe(true);
                // ownOrNull: [A, null] ok, [A, B] not
                expect(realmScopeMatches(RealmScope.OWN_OR_NULL, [A, null as any], A)).toBe(true);
                expect(realmScopeMatches(RealmScope.OWN_OR_NULL, [A, B], A)).toBe(false);
                // empty array fails closed for a scoped actor (unreachable); `any` still passes
                expect(realmScopeMatches(RealmScope.OWN, [], A)).toBe(false);
                expect(realmScopeMatches(RealmScope.ANY, [], A)).toBe(true);
            });
        });
    });
});
