/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy, PermissionItem, PolicyWithType } from '../../../src';
import {
    BuiltInPolicyType,
    ErrorCode,
    PermissionChecker,
    PermissionError,
    PermissionMemoryProvider,
} from '../../../src';

const abilities : PermissionItem[] = [
    {
        name: 'user_edit',
        policy: {
            type: BuiltInPolicyType.ATTRIBUTE_NAMES,
            names: ['name'],
        } satisfies PolicyWithType<AttributeNamesPolicy>,
    },
    {
        name: 'user_add',
    },
    {
        name: 'user_drop',
    },
];

const provider = new PermissionMemoryProvider(abilities);
const checker = new PermissionChecker({ provider });

describe('src/ability/manager.ts', () => {
    it('should work with policy', async () => {
        await checker.check({ name: 'user_edit', data: { attributes: { name: 'admin' } } });
    });

    it('should throw with failing evaluation', async () => {
        expect.assertions(3);

        try {
            await checker.check({ name: 'user_edit', data: { attributes: { id: '123' } } });
        } catch (e) {
            expect(e).toBeInstanceOf(PermissionError);

            if (e instanceof PermissionError) {
                expect(e.policy).toBeDefined();
                expect(e.code).toEqual(ErrorCode.PERMISSION_EVALUATION_FAILED);
            }
        }
    });
});
