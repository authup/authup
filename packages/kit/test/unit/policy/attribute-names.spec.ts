/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicyOptions } from '../../../src';
import { AttributeNamesPolicyEvaluator } from '../../../src';

describe('src/policy/attribute-names', () => {
    it('should restrict', () => {
        const policy : AttributeNamesPolicyOptions = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const evaluator = new AttributeNamesPolicyEvaluator();

        let outcome = evaluator.execute(policy, {});
        expect(outcome).toBeTruthy();

        outcome = evaluator.execute(policy, {
            target: {
                foo: 'bar',
                bar: 'baz',
            },
        });
        expect(outcome).toBeTruthy();

        outcome = evaluator.execute(policy, {
            target: {
                foo: 'bar',
                bar: 'baz',
                baz: 'boz',
            },
        });
        expect(outcome).toBeFalsy();
    });
});
