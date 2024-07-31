/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import type { SuperTest, Test } from 'supertest';
import type { Robot } from '@authup/core-kit';

export const TEST_DEFAULT_ROBOT : Partial<Robot> = {
    name: 'test',
    secret: 'start123',
    active: true,
};

export async function createSuperTestRobot(superTest: SuperTest<Test>, entity?: Partial<Robot>) {
    return superTest
        .post('/robots')
        .send({
            ...TEST_DEFAULT_ROBOT,
            ...(entity || {}),
        })
        .auth('admin', 'start123');
}

export async function updateSuperTestRobot(superTest: SuperTest<Test>, id: Robot['id'], entity?: Partial<Robot>) {
    return superTest
        .post(`/robots/${id}`)
        .send({
            ...(entity || {}),
        })
        .auth('admin', 'start123');
}
