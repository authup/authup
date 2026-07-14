/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { TrustAnchor } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import {
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
} from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { TrustAnchorService } from '../../../../../src/core/entities/trust-anchor/service.ts';
import { FakeTrustAnchorRepository } from './fake-repository.ts';

const CA_CERTIFICATE = readFileSync(
    new URL('../../../../data/certificates/certificate.pem', import.meta.url),
    'utf8',
);
const NON_CA_CERTIFICATE = readFileSync(
    new URL('../../../../data/certificates/non-ca-certificate.pem', import.meta.url),
    'utf8',
);

function buildTrustAnchor(overrides: Partial<TrustAnchor> = {}): Partial<TrustAnchor> {
    return {
        name: `ca-${randomUUID().slice(0, 8)}`,
        certificate: CA_CERTIFICATE,
        enabled: true,
        realm_id: randomUUID(),
        ...overrides,
    };
}

describe('core/entities/trust-anchor/service', () => {
    let repository: FakeTrustAnchorRepository;
    let service: TrustAnchorService;

    beforeEach(() => {
        repository = new FakeTrustAnchorRepository();
        service = new TrustAnchorService({ repository });
    });

    describe('getMany', () => {
        it('returns permitted anchors', async () => {
            repository.seed(buildTrustAnchor());

            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('rejects an actor without a key permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow();
        });

        it('drops rows rejected by the per-row realm gate', async () => {
            repository.seed([buildTrustAnchor(), buildTrustAnchor()]);

            const actor = createAllowAllActor();
            let calls = 0;
            actor.permissionEvaluator.setBehavior(({ method }) => {
                if (method === 'evaluateOneOf') {
                    calls += 1;
                    if (calls === 2) {
                        throw new Error('denied');
                    }
                }
            });

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toEqual(1);
        });
    });

    describe('create', () => {
        it('accepts a CA certificate and canonicalizes its name', async () => {
            const realmId = randomUUID();
            const entity = await service.create({
                name: '  Primary-CA  ',
                certificate: CA_CERTIFICATE,
                realm_id: realmId,
            }, createAllowAllActor());

            expect(entity.name).toEqual('primary-ca');
            expect(entity.certificate).toEqual(CA_CERTIFICATE);
            expect(entity.enabled).toBe(true);
            expect(entity.realm_id).toEqual(realmId);
        });

        it('rejects a non-CA certificate', async () => {
            await expect(service.create({
                name: 'leaf-certificate',
                certificate: NON_CA_CERTIFICATE,
                realm_id: randomUUID(),
            }, createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('rejects malformed certificate input', async () => {
            await expect(service.create({
                name: 'malformed-ca',
                certificate: 'x'.repeat(64),
                realm_id: randomUUID(),
            }, createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('defaults the realm to the actor realm', async () => {
            const actor = createMasterRealmActor();
            const entity = await service.create({
                name: 'actor-realm-ca',
                certificate: CA_CERTIFICATE,
            }, actor);

            expect(entity.realm_id).toEqual(actor.identity!.data.realm_id);
        });

        it('rejects a realm-less anchor', async () => {
            await expect(service.create({
                name: 'realm-less-ca',
                certificate: CA_CERTIFICATE,
            }, createAllowAllActor())).rejects.toThrow(/realm/i);
        });

        it('rejects a duplicate name in the same realm', async () => {
            const realmId = randomUUID();
            repository.seed(buildTrustAnchor({ name: 'duplicate-ca', realm_id: realmId }));

            await expect(service.create({
                name: 'duplicate-ca',
                certificate: CA_CERTIFICATE,
                realm_id: realmId,
            }, createAllowAllActor())).rejects.toThrow();
        });

        it('evaluates KEY_CREATE with anchor attributes', async () => {
            const actor = createAllowAllActor();
            await service.create({
                name: 'permission-ca',
                certificate: CA_CERTIFICATE,
                realm_id: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.evaluateCalls)
                .toContainEqual(expect.objectContaining({ name: PermissionName.KEY_CREATE }));
        });
    });

    describe('update', () => {
        it('updates name and enabled while keeping certificate and realm immutable', async () => {
            const [seeded] = repository.seed([buildTrustAnchor()]);

            const entity = await service.update(seeded.id, {
                name: 'renamed-ca',
                enabled: false,
                certificate: NON_CA_CERTIFICATE,
                realm_id: randomUUID(),
            }, createAllowAllActor());

            expect(entity.name).toEqual('renamed-ca');
            expect(entity.enabled).toBe(false);
            expect(entity.certificate).toEqual(CA_CERTIFICATE);
            expect(entity.realm_id).toEqual(seeded.realm_id);
        });
    });

    describe('delete', () => {
        it('deletes an anchor with KEY_DELETE', async () => {
            const [seeded] = repository.seed([buildTrustAnchor()]);

            const deleted = await service.delete(seeded.id, createAllowAllActor());
            expect(deleted.id).toEqual(seeded.id);
            expect(repository.getAll()).toHaveLength(0);
        });
    });
});
