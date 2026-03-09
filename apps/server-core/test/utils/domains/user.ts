/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { User } from '@authup/core-kit';

export function createFakeUser(data: Partial<User> = {}) {
    return {
        name: faker.internet.username(),
        display_name: faker.internet.displayName(),
        email: faker.internet.email(),
        name_locked: false,
        active: true,
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        password: faker.string.alphanumeric({ length: 64 }),
        ...data,
    } satisfies Partial<User>;
}
