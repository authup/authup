/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { RoleAttribute } from '@authup/core-kit';

export function createFakeRoleAttribute(data: Partial<RoleAttribute> = {}) {
    return {
        name: faker.string.alpha({
            length: 10 
        }),
        value: faker.string.alpha({
            length: 10 
        }),
        ...data,
    } satisfies Partial<RoleAttribute>;
}
