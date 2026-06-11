/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { User } from '@authup/core-kit';

// UserValidator requires >=3 characters for name/first_name/last_name;
// faker occasionally draws shorter values (e.g. "Al"), which made the
// suite flaky.
function atLeast(value: string, min = 3): string {
    return value.length >= min ? value : value.padEnd(min, 'x');
}

export function createFakeUser(data: Partial<User> = {}) {
    return {
        name: atLeast(faker.internet.username().toLowerCase()),
        display_name: faker.internet.displayName(),
        email: faker.internet.email().toLowerCase(),
        name_locked: false,
        active: true,
        first_name: atLeast(faker.person.firstName()),
        last_name: atLeast(faker.person.lastName()),
        password: faker.string.alphanumeric({ length: 64 }),
        ...data,
    } satisfies Partial<User>;
}
