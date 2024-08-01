/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TimePolicyOptions } from '@authup/permitus';
import { BuiltInPolicyType } from '@authup/permitus';
// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker';
import type { PolicyEntity } from '../../../src';

type TimePolicy = TimePolicyOptions & PolicyEntity & {
    parent_id?: string
};

export function createFakeTimePolicy(data: Partial<TimePolicy> = {}) {
    return {
        name: faker.internet.userName(),
        type: BuiltInPolicyType.TIME,
        start: '08:00',
        end: '16:00',
        invert: false,
        ...data,
    } satisfies Partial<TimePolicy>;
}
