/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { Permission } from '@authup/core-kit';
import type { TestAgent } from '../supertest';

export function createFakePermission(data: Partial<Permission> = {}) {
    return {
        name: faker.string.alpha({ casing: 'lower', length: 10 }),
        display_name: faker.internet.displayName(),
        description: faker.string.alpha({ length: 256 }),
        ...data,
    } satisfies Partial<Permission>;
}

export async function createSuperTestPermission(superTest: TestAgent, entity?: Partial<Permission>) {
    return superTest
        .post('/permissions')
        .send(createFakePermission(entity))
        .auth('admin', 'start123');
}
