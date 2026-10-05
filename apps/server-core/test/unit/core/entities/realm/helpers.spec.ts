/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isRealmReachable } from '../../../../../src/core/entities/realm/helpers.ts';

describe('core/entities/realm/helpers', () => {
    it.each([
        [null, null, true],
        [null, 'a', true],
        [undefined, 'a', true],
        ['a', 'a', true],
        ['a', 'b', false],
        ['a', null, false],
        ['a', undefined, false],
    ])('should answer a resource of realm %s from realm %s with %s', (resourceRealmId, realmId, expected) => {
        expect(isRealmReachable(resourceRealmId, realmId)).toBe(expected);
    });

    it('should not be symmetric', () => {
        expect(isRealmReachable(null, 'a')).toBe(true);
        expect(isRealmReachable('a', null)).toBe(false);
    });
});
