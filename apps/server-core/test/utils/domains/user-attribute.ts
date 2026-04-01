/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { UserAttribute } from '@authup/core-kit';

export function createFakeUserAttribute(data: Partial<UserAttribute> = {}) {
    return {
        name: faker.internet.username(),
        value: faker.string.alphanumeric({ length: 64 }),
        ...data,
    } satisfies Partial<UserAttribute>;
}
