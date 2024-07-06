/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicyOptions } from '../../../src';
import {
    AttributeNamesPolicyEvaluator,
    parseAttributeNamesPolicyOptions,
} from '../../../src';

const evaluator = new AttributeNamesPolicyEvaluator();

describe('src/policy/attribute-names', () => {
    it('should succeed with known attributes', async () => {
        const options : AttributeNamesPolicyOptions = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const outcome = await evaluator.evaluate({
            options,
            data: {
                attributes: {
                    foo: 'bar',
                    bar: 'baz',
                },
            },
        });
        expect(outcome)
            .toBeTruthy();
    });

    it('should parse options', () => {
        const output = parseAttributeNamesPolicyOptions({
            names: ['foo', 'bar'],
        } satisfies AttributeNamesPolicyOptions);

        expect(output.names).toEqual(['foo', 'bar']);
    });

    it('should parse options with unknown', () => {
        const output = parseAttributeNamesPolicyOptions({
            names: ['foo', 'bar'],
            foo: 'bar',
        } satisfies AttributeNamesPolicyOptions & { foo?: string }) as Partial<AttributeNamesPolicyOptions> & { foo?: string };

        expect(output.names).toBeDefined();
        expect(output.foo).toBeUndefined();
    });

    it('should fail with missing context', async () => {
        const options : AttributeNamesPolicyOptions = {
            invert: false,
            names: ['foo', 'bar'],
        };

        await expect(evaluator.evaluate({ options })).rejects.toThrow();
    });

    it('should fail with unknown attributes', async () => {
        const options : AttributeNamesPolicyOptions = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const outcome = await evaluator.evaluate({
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

    it('should succeed with known nested attributes', async () => {
        const options: AttributeNamesPolicyOptions = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate({
            options,
            data: {
                attributes: {
                    user: {
                        name: 'admin',
                    },
                },
            },
        });
        expect(outcome)
            .toBeTruthy();
    });

    it('should fail with unknown nested attributes', async () => {
        const options: AttributeNamesPolicyOptions = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate({
            options,
            data: {
                attributes: {
                    user: {
                        display_name: 'admin',
                    },
                },
            },
        });
        expect(outcome)
            .toBeFalsy();
    });

    it('should fail with partially known nested attributes', async () => {
        const options: AttributeNamesPolicyOptions = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate({
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
