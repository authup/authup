/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { Robot } from '@authup/core-kit';
import type { TestAgent } from '../supertest';

export function createFakeRobot(data: Partial<Robot> = {}) {
    return {
        name: faker.string.alpha({ casing: 'lower', length: 10 }),
        display_name: faker.internet.displayName(),
        secret: faker.string.alphanumeric({ length: 64 }),
        active: true,
        ...data,
    } satisfies Partial<Robot>;
}

export async function createSuperTestRobot(superTest: TestAgent, entity?: Partial<Robot>) {
    return superTest
        .post('/robots')
        .send(createFakeRobot(entity))
        .auth('admin', 'start123');
}

export async function updateSuperTestRobot(superTest: TestAgent, id: Robot['id'], entity?: Partial<Robot>) {
    return superTest
        .post(`/robots/${id}`)
        .send({
            ...(entity || {}),
        })
        .auth('admin', 'start123');
}
