/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker';
// eslint-disable-next-line import/no-extraneous-dependencies
import type { SuperTest, Test } from 'supertest';
import type { User } from '@authup/core-kit';

export function createFakeUser(data: Partial<User> = {}) {
    return {
        name: faker.internet.userName()
            .replaceAll('.', ''),
        email: faker.internet.email(),
        display_name: faker.internet.displayName(),
        name_locked: false,
        active: true,
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        password: faker.string.alphanumeric({ length: 64 }),
        ...data,
    } satisfies Partial<User>;
}

export async function createSuperTestUser(
    superTest: SuperTest<Test>,
    entity?: Partial<User>,
) {
    return superTest
        .post('/users')
        .send(createFakeUser(entity))
        .auth('admin', 'start123');
}

export async function updateSuperTestUser(superTest: SuperTest<Test>, id: User['id'], entity?: Partial<User>) {
    return superTest
        .post(`/users/${id}`)
        .send({
            ...(entity || {}),
        })
        .auth('admin', 'start123');
}
