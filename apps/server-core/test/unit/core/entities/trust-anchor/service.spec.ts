/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { TrustAnchor, User } from '@authup/core-kit';
import {
    EntityType,
    EventName,
    EventScope,
    IdentityType,
    PermissionName,
} from '@authup/core-kit';
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
import { FakeEventService } from '../../helpers/index.ts';
import { FakeTrustAnchorRepository } from './fake-repository.ts';

const CA_CERTIFICATE = readFileSync(
    new URL('../../../../data/certificates/certificate.pem', import.meta.url),
    'utf8',
);
const NON_CA_CERTIFICATE = readFileSync(
    new URL('../../../../data/certificates/non-ca-certificate.pem', import.meta.url),
    'utf8',
);

const REQUEST_SESSION_ID = 'f3b0dc71-0000-4000-8000-000000000006';

function buildTrustAnchor(overrides: Partial<TrustAnchor> = {}): Partial<TrustAnchor> {
    return {
        name: `ca-${randomUUID().slice(0, 8)}`,
        certificate: CA_CERTIFICATE,
        enabled: true,
        realmId: randomUUID(),
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
                realmId,
            }, createAllowAllActor());

            expect(entity.name).toEqual('primary-ca');
            expect(entity.certificate).toEqual(CA_CERTIFICATE);
            expect(entity.enabled).toBe(true);
            expect(entity.realmId).toEqual(realmId);
        });

        it('rejects a non-CA certificate', async () => {
            await expect(service.create({
                name: 'leaf-certificate',
                certificate: NON_CA_CERTIFICATE,
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('rejects malformed certificate input', async () => {
            await expect(service.create({
                name: 'malformed-ca',
                certificate: 'x'.repeat(64),
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('defaults the realm to the actor realm', async () => {
            const actor = createMasterRealmActor();
            const entity = await service.create({
                name: 'actor-realm-ca',
                certificate: CA_CERTIFICATE,
            }, actor);

            expect(entity.realmId).toEqual(actor.identity!.data.realmId);
        });

        it('rejects a realm-less anchor', async () => {
            await expect(service.create({
                name: 'realm-less-ca',
                certificate: CA_CERTIFICATE,
            }, createAllowAllActor())).rejects.toThrow(/realm/i);
        });

        it('rejects a duplicate name in the same realm', async () => {
            const realmId = randomUUID();
            repository.seed(buildTrustAnchor({ name: 'duplicate-ca', realmId }));

            await expect(service.create({
                name: 'duplicate-ca',
                certificate: CA_CERTIFICATE,
                realmId,
            }, createAllowAllActor())).rejects.toThrow();
        });

        it('evaluates KEY_CREATE with anchor attributes', async () => {
            const actor = createAllowAllActor();
            await service.create({
                name: 'permission-ca',
                certificate: CA_CERTIFICATE,
                realmId: randomUUID(),
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
                realmId: randomUUID(),
            }, createAllowAllActor());

            expect(entity.name).toEqual('renamed-ca');
            expect(entity.enabled).toBe(false);
            expect(entity.certificate).toEqual(CA_CERTIFICATE);
            expect(entity.realmId).toEqual(seeded.realmId);
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

    describe('audit events', () => {
        let eventService: FakeEventService;

        const buildActor = (actorId: string) => {
            const actor = createAllowAllActor();
            actor.identity = {
                type: IdentityType.USER,
                data: { id: actorId, name: 'admin' } as User,
            };
            return actor;
        };

        beforeEach(() => {
            eventService = new FakeEventService();
            service = new TrustAnchorService({
                repository,
                eventService,
                requestContext: () => ({
                    actorType: null,
                    actorId: null,
                    actorName: null,
                    sessionId: REQUEST_SESSION_ID,
                    requestPath: '/trust-anchors',
                    requestMethod: 'POST',
                    requestIpAddress: '203.0.113.7',
                    requestUserAgent: 'vitest',
                }),
            });
        });

        it('records a metadata-only created event (never certificate bytes)', async () => {
            const actorId = randomUUID();
            const realmId = randomUUID();
            const entity = await service.create({
                name: 'audited-ca',
                certificate: CA_CERTIFICATE,
                realmId,
            }, buildActor(actorId));

            expect(eventService.recordCalls).toHaveLength(1);
            const [call] = eventService.recordCalls;
            expect(call).toMatchObject({
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                refType: EntityType.TRUST_ANCHOR,
                refId: entity.id,
                realmId,
                actorType: IdentityType.USER,
                actorId,
                actorName: 'admin',
                sessionId: REQUEST_SESSION_ID,
                requestPath: '/trust-anchors',
                requestIpAddress: '203.0.113.7',
            });
            expect(call.data).toEqual({ name: 'audited-ca', enabled: true });
            expect(JSON.stringify(call)).not.toContain('BEGIN CERTIFICATE');
        });

        it('records an updated event carrying the scalar diff (enabled flip)', async () => {
            const [seeded] = repository.seed([buildTrustAnchor({ name: 'primary-ca', enabled: true })]);

            await service.update(seeded.id, { enabled: false }, buildActor(randomUUID()));

            expect(eventService.recordCalls).toHaveLength(1);
            const [call] = eventService.recordCalls;
            expect(call.name).toEqual(EventName.UPDATED);
            expect(call.data).toEqual({
                name: 'primary-ca',
                enabled: false,
                diff: { enabled: { next: false, previous: true } },
            });
        });

        it('records a deleted event', async () => {
            const [seeded] = repository.seed([buildTrustAnchor()]);

            await service.delete(seeded.id, buildActor(randomUUID()));

            expect(eventService.recordCalls).toHaveLength(1);
            const [call] = eventService.recordCalls;
            expect(call.name).toEqual(EventName.DELETED);
            expect(call.refType).toEqual(EntityType.TRUST_ANCHOR);
            expect(call.refId).toEqual(seeded.id);
        });

        it('records nothing when the mutation fails', async () => {
            await expect(service.create({
                name: 'leaf-only',
                certificate: NON_CA_CERTIFICATE,
                realmId: randomUUID(),
            }, buildActor(randomUUID()))).rejects.toThrow();

            expect(eventService.recordCalls).toHaveLength(0);
        });
    });
});
