/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFileSync } from 'node:fs';
import type { Realm } from '@authup/core-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { expectClientError } from '../../../../utils';

const CA_CERTIFICATE = readFileSync(
    new URL('../../../../data/certificates/certificate.pem', import.meta.url),
    'utf8',
);
const NON_CA_CERTIFICATE = readFileSync(
    new URL('../../../../data/certificates/non-ca-certificate.pem', import.meta.url),
    'utf8',
);

describe('src/http/controllers/trust-anchor', () => {
    const suite = createTestApplication();

    let realm: Realm;

    beforeAll(async () => {
        await suite.setup();
        realm = await suite.client.realm.create({ name: `trust-anchor-realm-${Date.now()}` });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should create and read a CA trust anchor by id and nested name', async () => {
        const created = await suite.client.trustAnchor.create({
            name: 'primary-client-ca',
            certificate: CA_CERTIFICATE,
            realm_id: realm.id,
        });

        expect(created.enabled).toBe(true);
        expect(created.certificate).toEqual(CA_CERTIFICATE);
        expect(created.realm_id).toEqual(realm.id);

        const byId = await suite.client.trustAnchor.getOne(created.id);
        expect(byId.id).toEqual(created.id);

        const byName = await suite.client.get(`realms/${realm.id}/trust-anchors/primary-client-ca`);
        expect(byName.data.id).toEqual(created.id);
    });

    it('should list anchors through the nested realm mount', async () => {
        const response = await suite.client.get(`realms/${realm.id}/trust-anchors`);

        expect(response.data.data)
            .toEqual(expect.arrayContaining([expect.objectContaining({ realm_id: realm.id })]));
    });

    it('should update name and enabled but keep certificate immutable', async () => {
        const created = await suite.client.trustAnchor.create({
            name: 'update-client-ca',
            certificate: CA_CERTIFICATE,
            realm_id: realm.id,
        });

        const response = await suite.client.post(`trust-anchors/${created.id}`, {
            name: 'updated-client-ca',
            enabled: false,
            certificate: NON_CA_CERTIFICATE,
        });
        const updated = response.data;

        expect(updated.name).toEqual('updated-client-ca');
        expect(updated.enabled).toBe(false);
        expect(updated.certificate).toEqual(CA_CERTIFICATE);
    });

    it('should reject a non-CA certificate', async () => {
        await expectClientError(
            () => suite.client.trustAnchor.create({
                name: 'leaf-certificate',
                certificate: NON_CA_CERTIFICATE,
                realm_id: realm.id,
            }),
            { status: 400 },
        );
    });

    it('should reject duplicate names per realm', async () => {
        await suite.client.trustAnchor.create({
            name: 'unique-client-ca',
            certificate: CA_CERTIFICATE,
            realm_id: realm.id,
        });

        await expectClientError(
            () => suite.client.trustAnchor.create({
                name: 'unique-client-ca',
                certificate: CA_CERTIFICATE,
                realm_id: realm.id,
            }),
            { status: 409 },
        );
    });

    it('should apply the route realm on nested writes', async () => {
        const response = await suite.client.post(`realms/${realm.id}/trust-anchors`, {
            name: 'nested-client-ca',
            certificate: CA_CERTIFICATE,
        });

        expect(response.data.realm_id).toEqual(realm.id);
    });

    it('should delete a trust anchor', async () => {
        const created = await suite.client.trustAnchor.create({
            name: 'delete-client-ca',
            certificate: CA_CERTIFICATE,
            realm_id: realm.id,
        });

        const deleted = await suite.client.trustAnchor.delete(created.id);
        expect(deleted.id).toEqual(created.id);

        await expectClientError(
            () => suite.client.trustAnchor.getOne(created.id),
            { status: 404 },
        );
    });

    it('should record attributed, metadata-only lifecycle audit events', async () => {
        const created = await suite.client.trustAnchor.create({
            name: 'audited-client-ca',
            certificate: CA_CERTIFICATE,
            realm_id: realm.id,
        });
        await suite.client.trustAnchor.update(created.id, { enabled: false });
        await suite.client.trustAnchor.delete(created.id);

        const { data } = await suite.client.event.getMany({ filter: { ref_type: 'trustAnchor', ref_id: created.id } });

        expect(data).toHaveLength(3);
        expect(new Set(data.map((row) => row.name)))
            .toEqual(new Set(['created', 'updated', 'deleted']));
        for (const row of data) {
            expect(row.realm_id).toEqual(realm.id);
            expect(row.actor_type).toEqual('user');
            expect(row.actor_name).toEqual('admin');
            expect(row.data).toMatchObject({ name: 'audited-client-ca' });
            // metadata only — never certificate bytes
            expect(JSON.stringify(row.data)).not.toContain('BEGIN CERTIFICATE');
        }

        const updatedRow = data.find((row) => row.name === 'updated');
        expect(updatedRow!.data!.diff).toEqual({ enabled: { next: false, previous: true } });
    });
});
