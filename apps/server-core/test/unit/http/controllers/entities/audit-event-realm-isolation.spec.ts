/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuditEventName, PermissionName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakeRealm, createFakeUser } from '../../../../utils';

/**
 * Wave-2 regression (mirrors the wave-0 field-projection suite): an own-scoped
 * `AUDIT_READ` holder must not be able to surface another realm's audit rows by
 * projecting `realm_id` (or the actor columns the ownership check reads) out of
 * the SQL SELECT via `fields[...]` — that would neutralize the per-row
 * realm_scope gate in `AuditEventService.getMany`.
 */
describe('audit-event (realm isolation)', () => {
    const suite = createTestApplication();

    let actor: HTTPClient;
    let ownRowId: string;
    let foreignRowId: string;
    const actorSecret = 'audit-realm-iso-actor-secret';

    beforeAll(async () => {
        await suite.setup();

        const realmB = await suite.client.realm.create(createFakeRealm());

        // a LOGIN audit row in the foreign realm (B)
        const userB = createFakeUser({ realm_id: realmB.id });
        const createdB = await suite.client.user.create(userB);
        await suite.client.token.createWithPassword({
            username: userB.name,
            password: userB.password!,
            realm_id: realmB.id,
        });

        // a LOGIN audit row in the actor's own realm (master)
        const userM = createFakeUser();
        const createdM = await suite.client.user.create(userM);
        await suite.client.token.createWithPassword({
            username: userM.name,
            password: userM.password!,
        });

        const foreignRows = await suite.client.auditEvent.getMany({ filter: { name: AuditEventName.LOGIN, actor_id: createdB.id } });
        expect(foreignRows.data.length).toBeGreaterThanOrEqual(1);
        foreignRowId = foreignRows.data[0].id;

        const ownRows = await suite.client.auditEvent.getMany({ filter: { name: AuditEventName.LOGIN, actor_id: createdM.id } });
        expect(ownRows.data.length).toBeGreaterThanOrEqual(1);
        ownRowId = ownRows.data[0].id;

        // a restricted actor in master holding AUDIT_READ at the default `own` scope
        const actorClient = await suite.client.client.create({
            ...createFakeClient(),
            is_confidential: true,
            secret: actorSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        const permission = await suite.client.permission.getOne(PermissionName.AUDIT_READ);
        await suite.client.clientPermission.create({
            client_id: actorClient.id,
            permission_id: permission.id,
        });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: actorClient.id,
            client_secret: actorSecret,
        });
        actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('keeps a foreign-realm audit event hidden even when realm_id is projected away', async () => {
        // control: the own-realm row IS visible to the own-scoped reader
        const own = await actor.auditEvent.getMany({
            filter: { id: ownRowId },
            fields: ['id', 'name'],
        });
        expect(own.data.some((row) => row.id === ownRowId)).toBe(true);

        // the foreign-realm row must NOT appear despite fields=id,name omitting realm_id
        const foreign = await actor.auditEvent.getMany({
            filter: { id: foreignRowId },
            fields: ['id', 'name'],
        });
        expect(foreign.data.some((row) => row.id === foreignRowId)).toBe(false);
    });
});
