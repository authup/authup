/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { SuperTest, Test } from 'supertest';
import { MASTER_REALM_ID, User } from '@authelion/common';

export const TEST_DEFAULT_USER : Partial<User> = {
    name: 'test',
    name_locked: false,
    display_name: 'TestUser',
    first_name: 'foo',
    last_name: 'bar',
    active: true,
    realm_id: MASTER_REALM_ID,
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
