/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';

import { ErrorCode } from '@authup/errors';
import type { AttributeNamesPolicy, PermissionPolicyBinding } from '../../../src';
import {
    BuiltInPolicyType,
    PermissionError,

    PermissionEvaluator,
    PermissionMemoryProvider,
    PolicyData,
    PolicyDefaultEvaluators,
    PolicyEngine,
} from '../../../src';

const abilities : PermissionPolicyBinding[] = [
    {
        permission: { name: 'user_edit' },
        policies: [
            {
                type: BuiltInPolicyType.ATTRIBUTE_NAMES,
                names: ['name'],
            } satisfies AttributeNamesPolicy,
        ],
    },
    { permission: { name: 'user_add' } },
    { permission: { name: 'user_drop' } },
];

const provider = new PermissionMemoryProvider(abilities);
const evaluator = new PermissionEvaluator({
    provider,
    policyEngine: new PolicyEngine(PolicyDefaultEvaluators),
});

describe('src/ability/manager.ts', () => {
    it('should work with policy', async () => {
        await evaluator.evaluate({
            name: 'user_edit',
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { name: 'admin' } }),
        });
    });

    it('should throw with failing evaluation', async () => {
        expect.assertions(2);

        try {
            await evaluator.evaluate({
                name: 'user_edit',
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { id: '123' } }),
            });
        } catch (e) {
            expect(e).toBeInstanceOf(PermissionError);

            if (e instanceof PermissionError) {
                expect(e.code).toEqual(ErrorCode.PERMISSION_EVALUATION_FAILED);
            }
        }
    });
});
