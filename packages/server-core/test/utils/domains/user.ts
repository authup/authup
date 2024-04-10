/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import type { SuperTest, Test } from 'supertest';
import type { User } from '@authup/core';

export const TEST_DEFAULT_USER : Partial<User> = {
    name: 'test',
    name_locked: false,
    display_name: 'TestUser',
    first_name: 'foo',
    last_name: 'bar',
    active: true,
};

export async function createSuperTestUser(superTest: SuperTest<Test>, entity?: Partial<User>) {
    return superTest
        .post('/users')
        .send({
            ...TEST_DEFAULT_USER,
            ...(entity || {}),
        })
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
