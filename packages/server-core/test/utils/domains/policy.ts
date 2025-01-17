/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TimePolicy } from '@authup/access';
import { BuiltInPolicyType } from '@authup/access';
import { faker } from '@faker-js/faker';
import type { PolicyEntity } from '../../../src';

type TimePolicyExtended = TimePolicy & PolicyEntity & {
    parent_id?: string
};

export function createFakeTimePolicy(data: Partial<TimePolicyExtended> = {}) {
    return {
        name: faker.internet.username(),
        display_name: faker.internet.displayName(),
        type: BuiltInPolicyType.TIME,
        start: '08:00',
        end: '16:00',
        invert: false,
        ...data,
    } satisfies Partial<TimePolicyExtended>;
}
