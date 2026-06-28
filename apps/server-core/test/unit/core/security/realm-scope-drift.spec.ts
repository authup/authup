/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { REALM_SCOPE } from '@authup/core-kit';
import { RealmScope } from '@authup/access';

/**
 * The realm-scope vocabulary lives in two packages that cannot depend on each other:
 * `@authup/core-kit` (REALM_SCOPE — drives the junction validators / wire payloads) and
 * `@authup/access` (RealmScope — drives the evaluation logic). They are hand-mirrored;
 * this guard fails the build if they ever diverge.
 */
describe('realm-scope drift guard (core-kit REALM_SCOPE <-> access RealmScope)', () => {
    it('the two value sets agree', () => {
        const coreKit = Object.values(REALM_SCOPE).sort();
        const access = Object.values(RealmScope).sort();
        expect(coreKit).toEqual(access);
    });
});
