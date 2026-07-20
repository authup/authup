/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { X509Certificate, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { Realm } from '@authup/core-kit';
import { KeyStatus } from '@authup/core-kit';
import type { OAuth2JsonWebKey } from '@authup/specs';
import { JWKType, JWKUse } from '@authup/specs';
import { KeyEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { createTestApplication } from '../../../../app';
import { expectClientError } from '../../../../utils';

const CERTIFICATE = readFileSync(
    new URL('../../../../data/certificates/certificate.pem', import.meta.url),
    'utf8',
);
const PRIVATE_KEY = readFileSync(
    new URL('../../../../data/certificates/private-key.pem', import.meta.url),
    'utf8',
);
const PUBLIC_KEY = readFileSync(
    new URL('../../../../data/certificates/public-key.pem', import.meta.url),
    'utf8',
);

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
        const response = await suite.client.key.getMany({ filters: { realmId: realm.id } });

        const uses = response.data.map((entity) => entity.use).sort();
        expect(uses).toEqual([JWKUse.ENCRYPTION, JWKUse.SIGNATURE]);

        for (const entity of response.data) {
            expect(entity.status).toEqual(KeyStatus.ACTIVE);
            expect(entity.name).toBeTruthy();
            // private material never leaves the server (nulled on every surface)
            expect(entity.decryptionKey).toBeNull();
        }
    });

    it('should generate a signature key (metadata + public part only)', async () => {
        const entity = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'generated-sig',
            realmId: realm.id,
        });

        expect(entity.type).toEqual(JWKType.RSA);
        expect(entity.signatureAlgorithm).toEqual('RS256');
        expect(entity.status).toEqual(KeyStatus.ACTIVE);
        expect(entity.decryptionKey).toBeNull();
        // the provisioned key holds priority 0 → generate = rotate
        expect(entity.priority).toBeGreaterThanOrEqual(1);
    });

    it('should read one resource by id and name', async () => {
        const created = await suite.client.key.create({
            use: JWKUse.ENCRYPTION,
            name: 'read-target',
            realmId: realm.id,
        });

        const byId = await suite.client.key.getOne(created.id);
        expect(byId.id).toEqual(created.id);

        const response = await suite.client.get(`realms/${realm.id}/keys/read-target`);
        expect(response.data.id).toEqual(created.id);
    });

    it('should scope the nested realm mount, expression dialect included', async () => {
        // the pre-IR controller spliced the route realm into the raw bracket
        // `filter` key; on a `codec=url-expression` payload that discarded the
        // client filter and made the expression parser throw (HTTP 500).
        await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'nested-exp-target',
            realmId: realm.id,
        });

        const filter = encodeURIComponent("eq(name,'nested-exp-target')");
        const response = await suite.client.get(
            `realms/${realm.id}/keys?codec=url-expression&filter=${filter}`,
        );

        expect(response.data.meta.total).toEqual(1);
        expect(response.data.data[0].name).toEqual('nested-exp-target');
        expect(response.data.data[0].realmId).toEqual(realm.id);
    });

    it('should intersect a conflicting client realm filter with the route realm', async () => {
        const other = await suite.client.realm.create({ name: `key-realm-conflict-${Date.now()}` });

        const response = await suite.client.get(
            `realms/${realm.id}/keys?filter[realmId]=${other.id}`,
        );

        expect(response.data.data).toHaveLength(0);
        expect(response.data.meta.total).toEqual(0);
    });

    it('should update name, priority and status', async () => {
        const created = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'update-target',
            realmId: realm.id,
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
            realmId: realm.id,
        });

        let jwks = await suite.client.get(`realms/${realm.id}/jwks`);
        let kids = jwks.data.keys.map((key: { kid: string }) => key.kid);
        expect(kids).toContain(created.id);

        await suite.client.key.update(created.id, { status: KeyStatus.DISABLED });

        jwks = await suite.client.get(`realms/${realm.id}/jwks`);
        kids = jwks.data.keys.map((key: { kid: string }) => key.kid);
        expect(kids).not.toContain(created.id);
    });

    it('should publish imported certificate metadata on every JWKS surface', async () => {
        const imported = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'jwks-certificate',
            decryptionKey: PRIVATE_KEY,
            encryptionKey: PUBLIC_KEY,
            certificate: CERTIFICATE,
            realmId: realm.id,
        });
        expect(imported.decryptionKey).toBeNull();
        expect(imported.certificate).toEqual(CERTIFICATE);

        const certificate = new X509Certificate(CERTIFICATE);
        const expectedX5c = [certificate.raw.toString('base64')];
        const expectedThumbprint = createHash('sha256')
            .update(certificate.raw)
            .digest('base64url');

        const collectionPaths = ['jwks', `realms/${realm.id}/jwks`];
        for (const path of collectionPaths) {
            const response = await suite.client.get(path);
            const entry = (response.data.keys as OAuth2JsonWebKey[])
                .find((key) => key.kid === imported.id);
            expect(entry).toMatchObject({
                x5c: expectedX5c,
                'x5t#S256': expectedThumbprint,
            });
        }

        const recordPaths = [`jwks/${imported.id}`, `realms/${realm.id}/jwks/${imported.id}`];
        for (const path of recordPaths) {
            const response = await suite.client.get(path);
            expect(response.data).toMatchObject({
                kid: imported.id,
                x5c: expectedX5c,
                'x5t#S256': expectedThumbprint,
            });
        }
    });

    it('should omit certificate metadata when absent or when a stored chain is malformed', async () => {
        const withoutCertificate = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'jwks-no-certificate',
            realmId: realm.id,
        });

        let response = await suite.client.get(`realms/${realm.id}/jwks`);
        let entry = (response.data.keys as OAuth2JsonWebKey[])
            .find((key) => key.kid === withoutCertificate.id);
        expect(entry).not.toHaveProperty('x5c');
        expect(entry).not.toHaveProperty('x5t#S256');

        await suite.dataSource.getRepository(KeyEntity).update(withoutCertificate.id, { certificate: 'malformed certificate row' });

        response = await suite.client.get(`realms/${realm.id}/jwks`);
        entry = (response.data.keys as OAuth2JsonWebKey[])
            .find((key) => key.kid === withoutCertificate.id);
        expect(entry?.kid).toEqual(withoutCertificate.id);
        expect(entry).not.toHaveProperty('x5c');
        expect(entry).not.toHaveProperty('x5t#S256');
    });

    it('should reject a duplicate name per realm', async () => {
        await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'unique-name',
            realmId: realm.id,
        });

        await expectClientError(
            () => suite.client.key.create({
                use: JWKUse.SIGNATURE,
                name: 'unique-name',
                realmId: realm.id,
            }),
            { status: 409 },
        );
    });

    it('should delete an unreferenced enc key without force', async () => {
        const created = await suite.client.key.create({
            use: JWKUse.ENCRYPTION,
            name: 'delete-target',
            realmId: realm.id,
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

        expect(response.data.realmId).toEqual(realm.id);
    });

    it('should record attributed, metadata-only lifecycle audit events', async () => {
        const created = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: 'audited-key',
            realmId: realm.id,
        });
        await suite.client.key.update(created.id, { status: KeyStatus.PASSIVE });
        await suite.client.key.delete(created.id);

        const { data } = await suite.client.event.getMany({ filters: { refType: 'key', refId: created.id } });

        expect(data).toHaveLength(3);
        expect(new Set(data.map((row) => row.name)))
            .toEqual(new Set(['created', 'updated', 'deleted']));
        for (const row of data) {
            expect(row.realmId).toEqual(realm.id);
            expect(row.actorType).toEqual('user');
            expect(row.actorName).toEqual('admin');
            expect(row.requestMethod).toBeTruthy();
            expect(row.data).toMatchObject({ name: 'audited-key', use: JWKUse.SIGNATURE });
            // metadata only — never key material
            expect(JSON.stringify(row.data)).not.toMatch(/decryption|encryption|certificate/);
        }

        const updatedRow = data.find((row) => row.name === 'updated');
        expect(updatedRow!.data!.diff).toEqual({ status: { next: KeyStatus.PASSIVE, previous: KeyStatus.ACTIVE } });
    });
});
