/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { BuiltInPolicyType, PolicyData, definePolicyInput } from '../../../src';

describe('src/policy/input', () => {
    it('builds a PolicyData carrying the well-known keys', () => {
        const data = definePolicyInput({
            [BuiltInPolicyType.ATTRIBUTES]: { realm_id: 'r1' },
            [BuiltInPolicyType.REALM_MATCH]: 'r1',
        });

        expect(data).toBeInstanceOf(PolicyData);
        expect(data.has(BuiltInPolicyType.ATTRIBUTES)).toBe(true);
        expect(data.get(BuiltInPolicyType.REALM_MATCH)).toBe('r1');
    });

    it('accepts unknown keys (open vocabulary for third-party evaluators)', () => {
        const data = definePolicyInput({ 'x-custom': { foo: 1 } });

        expect(data.has('x-custom')).toBe(true);
        expect(data.get('x-custom')).toEqual({ foo: 1 });
    });

    it('defaults to an empty bag', () => {
        const data = definePolicyInput();

        expect(data.has(BuiltInPolicyType.IDENTITY)).toBe(false);
    });
});
