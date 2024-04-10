/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import type { SuperTest, Test } from 'supertest';
import type { Permission } from '@authup/core-kit';

export const TEST_DEFAULT_PERMISSION : Partial<Permission> = {
    name: 'foo_add',
};

export async function createSuperTestPermission(superTest: SuperTest<Test>, entity?: Partial<Permission>) {
    return superTest
        .post('/permissions')
        .send({
            ...TEST_DEFAULT_PERMISSION,
            ...(entity || {}),
        })
        .auth('admin', 'start123');
}
