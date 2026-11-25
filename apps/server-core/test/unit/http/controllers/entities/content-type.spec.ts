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
import { createFakeClient, httpRequest } from '../../../../utils/index.ts';
import { createTestApplication } from '../../../../app/index.ts';

const AUTHORIZATION = `Basic ${Buffer.from('admin:start123').toBase64()}`;

describe('entity controllers: request body media type', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    let counter = 0;
    const nextName = () => `content-type-${Date.now()}-${counter++}`;

    function createRole(headers: Record<string, string>, body: BodyInit) {
        return httpRequest(suite, 'POST', '/roles', {
            headers: { authorization: AUTHORIZATION, ...headers },
            body,
        });
    }

    it('accepts json', async () => {
        const response = await createRole(
            { 'content-type': 'application/json' },
            JSON.stringify({ name: nextName() }),
        );

        expect(response.status).toEqual(201);
    });

    it('accepts json with a charset parameter', async () => {
        const response = await createRole(
            { 'content-type': 'application/json; charset=utf-8' },
            JSON.stringify({ name: nextName() }),
        );

        expect(response.status).toEqual(201);
    });

    it('accepts json and a urlencoded form in any letter case', async () => {
        const json = await createRole(
            { 'content-type': 'Application/JSON' },
            JSON.stringify({ name: nextName() }),
        );

        expect(json.status).toEqual(201);

        const form = await createRole(
            { 'content-type': 'APPLICATION/X-WWW-FORM-URLENCODED' },
            new URLSearchParams({ name: nextName() }).toString(),
        );

        expect(form.status).toEqual(201);
    });

    it('accepts a urlencoded form', async () => {
        const response = await httpRequest(suite, 'POST', '/roles', {
            headers: { authorization: AUTHORIZATION },
            form: { name: nextName() },
        });

        expect(response.status).toEqual(201);
    });

    it('refuses an unsupported media type with 415', async () => {
        const response = await createRole(
            { 'content-type': 'text/plain' },
            JSON.stringify({ name: nextName() }),
        );

        expect(response.status).toEqual(415);
        await expect(response.json()).resolves.toMatchObject({ code: ErrorCode.UNSUPPORTED_MEDIA_TYPE });
    });

    it('refuses a body without a content-type with 415', async () => {
        // a byte body makes fetch send no content-type of its own
        const response = await createRole(
            {},
            new TextEncoder().encode(JSON.stringify({ name: nextName() })),
        );

        expect(response.status).toEqual(415);
    });

    it('refuses a malformed content-type with 400', async () => {
        const response = await createRole(
            { 'content-type': 'application/' },
            JSON.stringify({ name: nextName() }),
        );

        expect(response.status).toEqual(400);
    });

    it('refuses an unsupported media type on an upsert and the realm-scoped mount', async () => {
        const put = await httpRequest(suite, 'PUT', `/roles/${nextName()}`, {
            headers: { authorization: AUTHORIZATION, 'content-type': 'text/plain' },
            body: '{}',
        });

        expect(put.status).toEqual(415);

        const nested = await httpRequest(suite, 'POST', '/realms/master/users', {
            headers: { authorization: AUTHORIZATION, 'content-type': 'text/plain' },
            body: JSON.stringify({ name: nextName() }),
        });

        expect(nested.status).toEqual(415);
    });

    it('refuses an unsupported media type on the registration workflow', async () => {
        const response = await httpRequest(suite, 'POST', '/register', {
            headers: { 'content-type': 'text/plain' },
            body: '{}',
        });

        expect(response.status).toEqual(415);
    });

    // A bodiless request is not checked (routup/plugins#888).
    it('answers a bodiless delete without checking', async () => {
        const created = await createRole(
            { 'content-type': 'application/json' },
            JSON.stringify({ name: nextName() }),
        );
        const { data } = await created.json();

        const response = await httpRequest(suite, 'DELETE', `/roles/${data.id}`, { headers: { authorization: AUTHORIZATION } });

        expect(response.status).toEqual(202);
    });

    it('answers a bodiless post without checking', async () => {
        // a secret rotation takes an optional body
        const { data: client } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: 'start1234',
        });

        const response = await httpRequest(suite, 'POST', `/clients/${client.id}/secret`, { headers: { authorization: AUTHORIZATION } });

        expect(response.status).toEqual(200);
    });

    it('answers a body-less get without checking', async () => {
        const response = await httpRequest(suite, 'GET', '/roles', { headers: { authorization: AUTHORIZATION } });

        expect(response.status).toEqual(200);
    });
});
