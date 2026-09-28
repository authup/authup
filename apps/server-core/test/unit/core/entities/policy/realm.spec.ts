/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isPolicyOfRealm } from '../../../../../src/core/entities/policy/realm.ts';

describe('core/entities/policy/realm', () => {
    it.each([
        [null, null, true],
        [null, 'a', true],
        [undefined, 'a', true],
        ['a', 'a', true],
        ['a', 'b', false],
        ['a', null, false],
    ])('should answer a policy of realm %s for realm %s with %s', (policyRealmId, realmId, expected) => {
        expect(isPolicyOfRealm({ realmId: policyRealmId }, realmId)).toBe(expected);
    });
});
