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
        const options : AttributeNamesPolicyOptions = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const evaluator = new AttributeNamesPolicyEvaluator();

        expect(() => {
            evaluator.evaluate({ options });
        }).toThrow();

        let outcome = evaluator.evaluate({
            options,
            data: {
                attributes: {
                    foo: 'bar',
                    bar: 'baz',
                },
            },
        });
        expect(outcome).toBeTruthy();

        outcome = evaluator.evaluate({
            options,
            data: {
                attributes: {
                    foo: 'bar',
                    bar: 'baz',
                    baz: 'boz',
                },
            },
        });
        expect(outcome).toBeFalsy();
    });

    it('should restrict nested attributes', () => {
        const options : AttributeNamesPolicyOptions = {
            names: [
                'user.name',
                'age',
            ],
        };

        const evaluator = new AttributeNamesPolicyEvaluator();
        let outcome = evaluator.evaluate({
            options,
            data: {
                attributes: {
                    name: 'admin',
                },
            },
        });
        expect(outcome).toBeFalsy();

        outcome = evaluator.evaluate({
            options,
            data: {
                attributes: {
                    user: {
                        name: 'admin',
                    },
                },
            },
        });
        expect(outcome).toBeTruthy();

        outcome = evaluator.evaluate({
            options,
            data: {
                attributes: {
                    user: {
                        name: 'admin',
                        id: 'xxx',
                    },
                },
            },
        });
        expect(outcome).toBeFalsy();
    });
});
