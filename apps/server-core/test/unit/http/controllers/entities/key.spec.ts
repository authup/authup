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
import type { Realm } from '@authup/core-kit';
import { KeyStatus } from '@authup/core-kit';
import { JWKType, JWKUse } from '@authup/specs';
import { createTestApplication } from '../../../../app';
import { expectClientError } from '../../../../utils';

describe('src/http/controllers/key', () => {
    const suite = createTestApplication();

    let realm : Realm;

    beforeAll(async () => {
        await suite.setup();

        // a fresh realm keeps assertions deterministic on the suite-shared
        // database AND exercises the realm-create key provisioning hook.
        realm = await suite.client.realm.create({ name: `key-realm-${Date.now()}` });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should eagerly provision sig + enc keys at realm creation (plan 071 hybrid)', async () => {
        const response = await suite.client.key.getMany({ filter: { realm_id: realm.id } });

        const uses = response.data.map((entity) => entity.use).sort();
        expect(uses).toEqual([JWKUse.ENCRYPTION, JWKUse.SIGNATURE]);

        for (const entity of response.data) {
            expect(entity.status).toEqual(KeyStatus.ACTIVE);
            expect(entity.name).toBeTruthy();
            // private material never leaves the server
            expect(entity.decryption_key).toBeUndefined();
        }
    });

    it('should generate a signature key (metadata + public part only)', async () => {
        const entity = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'generated-sig',
            realm_id: realm.id,
        });

        expect(entity.type).toEqual(JWKType.RSA);
        expect(entity.signature_algorithm).toEqual('RS256');
        expect(entity.status).toEqual(KeyStatus.ACTIVE);
        expect(entity.decryption_key).toBeNull();
        // the provisioned key holds priority 0 → generate = rotate
        expect(entity.priority).toBeGreaterThanOrEqual(1);
    });

    it('should read one resource by id and name', async () => {
        const created = await suite.client.key.create({
            use: JWKUse.ENCRYPTION,
            name: 'read-target',
            realm_id: realm.id,
        });

        const byId = await suite.client.key.getOne(created.id);
        expect(byId.id).toEqual(created.id);

        const response = await suite.client.get(`realms/${realm.id}/keys/read-target`);
        expect(response.data.id).toEqual(created.id);
    });

    it('should update name, priority and status', async () => {
        const created = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'update-target',
            realm_id: realm.id,
        });

        const updated = await suite.client.key.update(created.id, {
            name: 'update-renamed',
            priority: 42,
            status: KeyStatus.PASSIVE,
        });

        expect(updated.name).toEqual('update-renamed');
        expect(updated.priority).toEqual(42);
        expect(updated.status).toEqual(KeyStatus.PASSIVE);
        expect(updated.use).toEqual(created.use);
    });

    it('should hide disabled keys from the realm JWKS', async () => {
        const created = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'jwks-lifecycle',
            realm_id: realm.id,
        });

        let jwks = await suite.client.get(`realms/${realm.id}/jwks`);
        let kids = jwks.data.keys.map((key: { kid: string }) => key.kid);
        expect(kids).toContain(created.id);

        await suite.client.key.update(created.id, { status: KeyStatus.DISABLED });

        jwks = await suite.client.get(`realms/${realm.id}/jwks`);
        kids = jwks.data.keys.map((key: { kid: string }) => key.kid);
        expect(kids).not.toContain(created.id);
    });

    it('should reject a duplicate name per realm', async () => {
        await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'unique-name',
            realm_id: realm.id,
        });

        await expectClientError(
            () => suite.client.key.create({
                use: JWKUse.SIGNATURE,
                name: 'unique-name',
                realm_id: realm.id,
            }),
            { status: 409 },
        );
    });

    it('should delete an unreferenced enc key without force', async () => {
        const created = await suite.client.key.create({
            use: JWKUse.ENCRYPTION,
            name: 'delete-target',
            realm_id: realm.id,
        });

        const deleted = await suite.client.key.delete(created.id);
        expect(deleted.id).toEqual(created.id);

        await expectClientError(
            () => suite.client.key.getOne(created.id),
            { status: 404 },
        );
    });

    it('should apply the route realm on nested writes (route wins over body)', async () => {
        const response = await suite.client.post(`realms/${realm.id}/keys`, {
            use: JWKUse.SIGNATURE,
            name: 'nested-create',
        });

        expect(response.data.realm_id).toEqual(realm.id);
    });
});
