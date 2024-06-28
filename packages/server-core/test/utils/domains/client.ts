/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import type { SuperTest, Test } from 'supertest';
import type { Client } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';

export const TEST_DEFAULT_CLIENT : Partial<Client> = {
    name: 'test',
    secret: 'foo',
    redirect_uri: 'https://example.com/*',
    is_confidential: true,
};

export async function createSuperTestClient(superTest: SuperTest<Test>, entity?: Partial<Client>) {
    return superTest
        .post('/clients')
        .send({
            ...TEST_DEFAULT_CLIENT,
            ...(entity || {}),
        })
        .auth('admin', 'start123');
}

export async function createSuperTestClientWithScope(
    superTest: SuperTest<Test>,
    entity?: Partial<Client>,
) {
    const client = await createSuperTestClient(superTest, entity);

    const { body: scope } = await superTest
        .get(`/scopes/${ScopeName.GLOBAL}`)
        .auth('admin', 'start123');

    await superTest
        .post('/client-scopes')
        .send({
            client_id: client.body.id,
            scope_id: scope.id,
        })
        .auth('admin', 'start123');

    return client;
}
