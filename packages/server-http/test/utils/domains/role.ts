/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { SuperTest, Test } from 'supertest';
import { Role } from '@authup/common';

export const TEST_DEFAULT_ROLE : Partial<Role> = {
    name: 'test',
};

export async function createSuperTestRole(superTest: SuperTest<Test>, entity?: Partial<Role>) {
    return superTest
        .post('/roles')
        .send({
            ...TEST_DEFAULT_ROLE,
            ...(entity || {}),
        })
        .auth('admin', 'start123');
}
