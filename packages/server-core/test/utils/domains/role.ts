/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { Role } from '@authup/core-kit';
import type { TestAgent } from '../supertest';

export function createFakeRole(data: Partial<Role> = {}) {
    return {
        name: faker.string.alpha({ casing: 'lower', length: 10 }),
        display_name: faker.internet.displayName(),
        description: faker.string.alpha({ length: 256 }),
        ...data,
    } satisfies Partial<Role>;
}

export async function createSuperTestRole(superTest: TestAgent, entity?: Partial<Role>) {
    return superTest
        .post('/roles')
        .send(createFakeRole(entity))
        .auth('admin', 'start123');
}
