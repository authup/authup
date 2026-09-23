/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

type Case = {
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, any>,
    status: number,
    code?: string,
};

const ID = 'not-a-uuid';

const NAMED_ENTITIES = [
    'users',
    'roles',
    'clients',
    'permissions',
    'policies',
    'scopes',
    'realms',
    'keys',
    'trust-anchors',
];

const ID_ONLY_ENTITIES = [
    'sessions',
    'session-tokens',
    'consents',
    'user-attributes',
    'role-attributes',
    'identity-provider-accounts',
    'user-roles',
    'role-permissions',
    'user-permissions',
    'client-roles',
    'client-permissions',
    'client-scopes',
    'permission-policies',
    'identity-provider-role-mappings',
];

const UPDATABLE_BY_ID = [
    'role-permissions',
    'user-permissions',
    'client-permissions',
    'identity-provider-role-mappings',
    'user-attributes',
    'role-attributes',
];

const notFound = (
    method: Case['method'],
    path: string,
    body?: Record<string, any>,
    code: string = ErrorCode.ENTITY_NOT_FOUND,
) : Case => ({
    method,
    path,
    body,
    status: 404,
    code,
});

const CASES: Case[] = [
    ...NAMED_ENTITIES.map((entity) => notFound('DELETE', `/${entity}/${ID}`)),
    ...ID_ONLY_ENTITIES.flatMap((entity) => [
        notFound('GET', `/${entity}/${ID}`),
        notFound('DELETE', `/${entity}/${ID}`),
    ]),
    notFound('GET', `/events/${ID}`),
    ...UPDATABLE_BY_ID.map((entity) => notFound('POST', `/${entity}/${ID}`, { value: 'x' })),
    notFound('GET', `/jwks/${ID}`, undefined, ErrorCode.JWK_NOT_FOUND),
    notFound('GET', `/realms/master/jwks/${ID}`, undefined, ErrorCode.JWK_NOT_FOUND),
    notFound('GET', `/users/@me/authenticators/${ID}`),
    notFound('DELETE', `/users/@me/authenticators/${ID}`),
    notFound('POST', `/users/@me/authenticators/${ID}/confirm`, { code: '123456' }),
    {
        method: 'GET',
        path: `/users/${ID}/authenticators`,
        status: 200,
    },
    {
        method: 'POST',
        path: '/user-attributes',
        body: {
            userId: ID,
            name: 'foo',
            value: 'bar',
        },
        status: 400,
        code: ErrorCode.ENTITY_RELATION_INVALID,
    },
    {
        method: 'POST',
        path: '/role-attributes',
        body: {
            roleId: ID,
            name: 'foo',
            value: 'bar',
        },
        status: 400,
        code: ErrorCode.ENTITY_RELATION_INVALID,
    },
];

// #3650: an id that is not a uuid cannot exist, so every dialect answers as
// it does for an unknown one. Postgres would otherwise refuse to parse the
// bind (22P02) and answer 400 where sqlite and mysql answer 404.
describe('src/http/controllers/entities (malformed id)', () => {
    const suite = createTestApplication();

    const basic = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it.each(CASES)('$method $path should answer $status', async (input) => {
        const response = await httpRequest(suite, input.method, input.path, {
            headers: {
                Authorization: basic,
                ...(input.body ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(input.body ? { body: JSON.stringify(input.body) } : {}),
        });

        const body = await response.json();

        expect(response.status).toEqual(input.status);

        if (input.code) {
            expect(body.code).toEqual(input.code);
        }

        if (input.status === 200) {
            expect(body.data).toEqual([]);
        }
    });
});
