/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName, EventScope, IdentityType } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeUser, expectClientError, httpRequest } from '../../../../utils';

describe('src/http/controllers/entities/event', () => {
    const suite = createTestApplication();

    const user = createFakeUser();
    let userId: string;

    const adminAuthorization = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

    beforeAll(async () => {
        await suite.setup();

        const { data: created } = await suite.client.user.create(user);
        userId = created.id;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('records a login audit event on a successful password grant', async () => {
        const response = await suite.client.token.createWithPassword({
            username: user.name,
            password: user.password!,
        });
        expect(response.access_token).toBeDefined();

        const { data } = await suite.client.event.getMany({ filters: { name: EventName.LOGIN, actorId: userId } });
        expect(data.length).toBeGreaterThanOrEqual(1);

        const [row] = data;
        expect(row.scope).toEqual(EventScope.OAUTH2);
        expect(row.name).toEqual(EventName.LOGIN);
        expect(row.actorType).toEqual(IdentityType.USER);
        expect(row.actorId).toEqual(userId);
        expect(row.actorName).toEqual(user.name);
        expect(row.realmId).toBeTruthy();
        expect(row.refType).toEqual('session');
        expect(row.refId).toBeTruthy();

        // context data carries the grant type + session correlation id —
        // and never any credential material.
        expect(row.data).toBeTruthy();
        expect(row.data!.grantType).toEqual('password');
        expect(row.data!.sessionId).toEqual(row.refId);
        expect(row.data!.password).toBeUndefined();
        expect(JSON.stringify(row.data)).not.toContain(user.password);
    });

    it('records a loginFailed audit event with the canonicalized identifier and no actor id', async () => {
        await expectClientError(
            () => suite.client.token.createWithPassword({
                username: `  ${user.name.toUpperCase()}  `,
                password: 'this-is-not-the-password',
            }),
            { status: 400 },
        );

        const { data } = await suite.client.event.getMany({ filters: { name: EventName.LOGIN_FAILED, actorName: user.name } });
        expect(data.length).toBeGreaterThanOrEqual(1);

        const [row] = data;
        expect(row.scope).toEqual(EventScope.OAUTH2);
        expect(row.actorId).toBeNull();
        expect(row.actorType).toBeNull();
        // the submitted identifier, canonicalized (trim + lowercase)
        expect(row.actorName).toEqual(user.name);
        expect(row.requestIpAddress).toBeTruthy();
        expect(row.data).toBeTruthy();
        expect(row.data!.errorCode).toEqual(ErrorCode.ENTITY_CREDENTIALS_INVALID);
        expect(JSON.stringify(row.data)).not.toContain('this-is-not-the-password');
    });

    it('filters the collection by event name', async () => {
        const { data } = await suite.client.event.getMany({ filters: { name: EventName.LOGIN } });

        expect(data.length).toBeGreaterThanOrEqual(1);
        expect(data.every((row) => row.name === EventName.LOGIN)).toBe(true);
    });

    it('reads a single audit event', async () => {
        const { data } = await suite.client.event.getMany({ filters: { name: EventName.LOGIN, actorId: userId } });
        expect(data.length).toBeGreaterThanOrEqual(1);

        const { data: row } = await suite.client.event.getOne(data[0].id);
        expect(row.id).toEqual(data[0].id);
        expect(row.name).toEqual(EventName.LOGIN);
    });

    // Generous timeout: an AUTHENTICATED request to an unmatched route is slow
    // (~4s) in this app — the dispatcher's not-found walk re-enters the
    // authorization middleware many times, re-verifying the Basic credentials
    // each time. Pre-existing behavior (reproducible with any Basic-auth'd
    // request to e.g. /unknown-path), unrelated to the audit surface.
    it('rejects write attempts (append-only surface)', async () => {
        const post = await httpRequest(suite, 'POST', '/events', {
            headers: { Authorization: adminAuthorization },
            form: { name: 'login', scope: 'oauth2' },
        });
        expect([404, 405]).toContain(post.status);

        const { data } = await suite.client.event.getMany({ filters: { name: EventName.LOGIN, actorId: userId } });
        expect(data.length).toBeGreaterThanOrEqual(1);

        const del = await httpRequest(suite, 'DELETE', `/events/${data[0].id}`, { headers: { Authorization: adminAuthorization } });
        expect([404, 405]).toContain(del.status);

        // the row survives the delete attempt
        const { data: row } = await suite.client.event.getOne(data[0].id);
        expect(row.id).toEqual(data[0].id);
    }, 30_000);

    it('never throttles repeated failures with the default config (throttle off)', async () => {
        const victim = createFakeUser();
        await suite.client.user.create(victim);

        // default loginAttemptThreshold is 5 — go beyond it
        for (let i = 0; i < 7; i++) {
            const response = await httpRequest(suite, 'POST', '/token', {
                form: {
                    grant_type: 'password',
                    username: victim.name,
                    password: 'definitely-wrong-password',
                },
            });
            expect(response.status).toEqual(400);
        }
    });
});
