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
    mergeRealmReach,
    minRealmScope,
    normalizeRealmScope,
    realmReachCap,
    realmReachMatches,
    realmReachSuperset,
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
        });
    });

    describe('ordering', () => {
        it('orders own < own_or_null < any', () => {
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
            expect(minRealmScope(RealmScope.ANY, RealmScope.OWN)).toBe(RealmScope.OWN);
            expect(minRealmScope(RealmScope.ANY, RealmScope.OWN_OR_NULL)).toBe(RealmScope.OWN_OR_NULL);
            expect(minRealmScope(undefined, RealmScope.ANY)).toBe(RealmScope.OWN);
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

        it('own_or_null matches own realm and null/global', () => {
            expect(realmScopeMatches(RealmScope.OWN_OR_NULL, A, A)).toBe(true);
            expect(realmScopeMatches(RealmScope.OWN_OR_NULL, null, A)).toBe(true);
            expect(realmScopeMatches(RealmScope.OWN_OR_NULL, B, A)).toBe(false);
        });

        it('denies a realm-less actor under own / own_or_null (no A=null === R=null leak)', () => {
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

        it('none never matches relatively', () => {
            expect(realmScopeMatches(RealmScope.NONE, A, A)).toBe(false);
            expect(realmScopeMatches(RealmScope.NONE, null, A)).toBe(false);
        });
    });

    describe('realmReachMatches (relative OR allowlist)', () => {
        const A = 'realm-a';
        const B = 'realm-b';
        const C = 'realm-c';

        it('matches a concrete realm in the allowlist regardless of actor realm', () => {
            const reach = { scope: RealmScope.NONE, realm_ids: [A, B] };
            expect(realmReachMatches(reach, A, C)).toBe(true); // actor in C, resource A in list
            expect(realmReachMatches(reach, B, null)).toBe(true); // realm-less actor, B in list
            expect(realmReachMatches(reach, C, C)).toBe(false); // C not in list, none scope
        });

        it('own + allowlist = own realm OR the listed realm', () => {
            const reach = { scope: RealmScope.OWN, realm_ids: [B] };
            expect(realmReachMatches(reach, A, A)).toBe(true); // own
            expect(realmReachMatches(reach, B, A)).toBe(true); // listed
            expect(realmReachMatches(reach, C, A)).toBe(false); // neither
        });

        it('allowlist never matches null/global (concrete ids only)', () => {
            expect(realmReachMatches({ scope: RealmScope.NONE, realm_ids: [A] }, null, A)).toBe(false);
        });
    });

    describe('mergeRealmReach', () => {
        it('folds scope by max and realm_ids by union', () => {
            const merged = mergeRealmReach([
                { scope: RealmScope.OWN, realm_ids: ['a'] },
                { scope: RealmScope.OWN_OR_NULL, realm_ids: ['b'] },
            ]);
            expect(merged.scope).toBe(RealmScope.OWN_OR_NULL);
            expect([...(merged.realm_ids ?? [])].sort()).toEqual(['a', 'b']);
        });

        it('empty folds to fail-closed own with no ids', () => {
            const merged = mergeRealmReach([]);
            expect(merged.scope).toBe(RealmScope.OWN);
            expect(merged.realm_ids).toBeNull();
        });
    });

    describe('realmReachSuperset', () => {
        it('relative ordinal: any ⊇ own_or_null ⊇ own ⊇ none', () => {
            expect(realmReachSuperset({ scope: RealmScope.ANY }, { scope: RealmScope.OWN })).toBe(true);
            expect(realmReachSuperset({ scope: RealmScope.OWN }, { scope: RealmScope.OWN_OR_NULL })).toBe(false);
        });

        it('symbolic own NEVER covers a concrete child realm id (deny-if-unsure)', () => {
            // realm_admin-ish (own_or_null, no ids) must NOT superset a {B} grant
            expect(realmReachSuperset(
                { scope: RealmScope.OWN_OR_NULL },
                { scope: RealmScope.NONE, realm_ids: ['realm-b'] },
            )).toBe(false);
        });

        it('any covers any concrete set; explicit ids must be a superset', () => {
            expect(realmReachSuperset({ scope: RealmScope.ANY }, { scope: RealmScope.NONE, realm_ids: ['x', 'y'] })).toBe(true);
            expect(realmReachSuperset(
                { scope: RealmScope.NONE, realm_ids: ['x', 'y'] },
                { scope: RealmScope.NONE, realm_ids: ['x'] },
            )).toBe(true);
            expect(realmReachSuperset(
                { scope: RealmScope.NONE, realm_ids: ['x'] },
                { scope: RealmScope.NONE, realm_ids: ['x', 'y'] },
            )).toBe(false);
        });
    });

    describe('realmReachCap', () => {
        it('caps relative scope to the creator ceiling', () => {
            expect(realmReachCap({ scope: RealmScope.ANY }, { scope: RealmScope.OWN_OR_NULL }).scope).toBe(RealmScope.OWN_OR_NULL);
        });

        it('an any creator may grant any concrete realm ids', () => {
            const capped = realmReachCap({ scope: RealmScope.NONE, realm_ids: ['a', 'b'] }, { scope: RealmScope.ANY });
            expect([...(capped.realm_ids ?? [])].sort()).toEqual(['a', 'b']);
        });

        it('a non-any creator can only grant realm ids it explicitly holds', () => {
            // realm_admin (own_or_null, no ids) requesting {b} => filtered to null
            const capped = realmReachCap(
                { scope: RealmScope.OWN_OR_NULL, realm_ids: ['b'] },
                { scope: RealmScope.OWN_OR_NULL },
            );
            expect(capped.realm_ids).toBeNull();
            // a creator holding {b} explicitly may pass it through
            const capped2 = realmReachCap(
                { scope: RealmScope.NONE, realm_ids: ['b'] },
                { scope: RealmScope.NONE, realm_ids: ['b', 'c'] },
            );
            expect(capped2.realm_ids).toEqual(['b']);
        });
    });
});
