/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy } from '../../../src';
import {
    AttributeNamesPolicyEvaluator,
    AttributeNamesPolicyValidator,
} from '../../../src';

const evaluator = new AttributeNamesPolicyEvaluator();

describe('src/policy/attribute-names', () => {
    it('should succeed with known attributes', async () => {
        const policy : AttributeNamesPolicy = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const outcome = await evaluator.evaluate({
            policy,
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

    it('should parse options', async () => {
        const validator = new AttributeNamesPolicyValidator();
        const output = await validator.run({
            names: ['foo', 'bar'],
        } satisfies AttributeNamesPolicy);

        expect(output.names).toEqual(['foo', 'bar']);
    });

    it('should parse options with unknown', async () => {
        const validator = new AttributeNamesPolicyValidator();
        const output = await validator.run({
            names: ['foo', 'bar'],
            foo: 'bar',
        } satisfies AttributeNamesPolicy & { foo?: string }) as Partial<AttributeNamesPolicy> & { foo?: string };

        expect(output.names).toBeDefined();
        expect(output.foo).toBeUndefined();
    });

    it('should fail with missing context', async () => {
        const policy : AttributeNamesPolicy = {
            invert: false,
            names: ['foo', 'bar'],
        };

        await expect(evaluator.evaluate({ policy, data: {} })).rejects.toThrow();
    });

    it('should fail with unknown attributes', async () => {
        const policy : AttributeNamesPolicy = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const outcome = await evaluator.evaluate({
            policy,
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
        const policy: AttributeNamesPolicy = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate({
            policy,
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
        const policy: AttributeNamesPolicy = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate({
            policy,
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
        const policy: AttributeNamesPolicy = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate({
            policy,
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
