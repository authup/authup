/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicyEvalContext } from '../../../src/policy';
import { evalAttributeNamesPolicy } from '../../../src/policy';

describe('src/policy/attribute-names', () => {
    it('should restrict', () => {
        const policy : AttributeNamesPolicyEvalContext = {
            invert: false,
            names: ['foo', 'bar'],
        };

        let outcome = evalAttributeNamesPolicy(policy);
        expect(outcome).toBeTruthy();

        outcome = evalAttributeNamesPolicy(policy, {
            foo: 'bar',
            bar: 'baz',
        });
        expect(outcome).toBeTruthy();

        outcome = evalAttributeNamesPolicy(policy, {
            foo: 'bar',
            bar: 'baz',
            baz: 'boz',
        });
        expect(outcome).toBeFalsy();
    });
});
