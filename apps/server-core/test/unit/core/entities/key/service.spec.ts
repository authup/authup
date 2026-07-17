/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Key, User } from '@authup/core-kit';
import {
    EntityType,
    EventName,
    EventScope,
    IdentityType,
    KeyStatus,
    PermissionName,
} from '@authup/core-kit';
import { ErrorCode, isAuthupError } from '@authup/errors';
import { AsymmetricKey, createAsymmetricKeyPair } from '@authup/server-kit';
import { JWKType, JWKUse, JWTAlgorithm } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import {
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
} from '@authup/server-test-kit';
import { KeyService } from '../../../../../src/core/entities/key/service.ts';
import { FakeEventService } from '../../helpers/index.ts';
import { FakeKeyRepository } from './fake-repository.ts';

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

function buildKey(overrides: Partial<Key> = {}): Partial<Key> {
    return {
        name: `sig-${randomUUID().slice(0, 8)}`,
        type: JWKType.RSA,
        use: JWKUse.SIGNATURE,
        status: KeyStatus.ACTIVE,
        signatureAlgorithm: JWTAlgorithm.RS256,
        priority: 0,
        encryptionKey: 'public-material',
        realmId: randomUUID(),
        ...overrides,
    };
}

describe('core/entities/key/service', () => {
    let repository: FakeKeyRepository;
    let service: KeyService;

    beforeEach(() => {
        repository = new FakeKeyRepository();
        service = new KeyService({ repository });
    });

    describe('getMany', () => {
        it('returns entities for a permitted actor', async () => {
            repository.seed([buildKey()]);

            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('rejects an actor without any key permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow();
        });

        it('drops rows the per-row realm gate rejects', async () => {
            repository.seed([buildKey(), buildKey()]);

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

    describe('create — generate', () => {
        it('generates an RSA signature key by default (metadata only in the response)', async () => {
            const realmId = randomUUID();
            const entity = await service.create({ use: JWKUse.SIGNATURE, realmId }, createAllowAllActor());

            expect(entity.type).toEqual(JWKType.RSA);
            expect(entity.signatureAlgorithm).toEqual(JWTAlgorithm.RS256);
            expect(entity.status).toEqual(KeyStatus.ACTIVE);
            expect(entity.name).toMatch(/^sig-/);
            expect(entity.priority).toEqual(0);
            expect(entity.realmId).toEqual(realmId);
            // private material never leaves the server
            expect(entity.decryptionKey).toBeNull();
            expect(entity.encryptionKey).toBeTruthy();
        });

        it('generates an EC key for an ES algorithm', async () => {
            const entity = await service.create({
                use: JWKUse.SIGNATURE,
                signatureAlgorithm: JWTAlgorithm.ES256,
                realmId: randomUUID(),
            }, createAllowAllActor());

            expect(entity.type).toEqual(JWKType.EC);
            expect(entity.signatureAlgorithm).toEqual(JWTAlgorithm.ES256);
        });

        it('rejects an HMAC signature algorithm (JWKS cannot publish shared secrets)', async () => {
            await expect(service.create({
                use: JWKUse.SIGNATURE,
                signatureAlgorithm: JWTAlgorithm.HS256,
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toThrow(/not supported/);
        });

        it('generates oct material for an encryption key', async () => {
            const entity = await service.create({ use: JWKUse.ENCRYPTION, realmId: randomUUID() }, createAllowAllActor());

            expect(entity.type).toEqual(JWKType.OCT);
            expect(entity.signatureAlgorithm).toBeNull();
            expect(entity.decryptionKey).toBeNull();
            expect(entity.encryptionKey).toBeNull();
            expect(entity.name).toMatch(/^enc-/);
        });

        it('increments the priority above the realm\'s highest (generate = rotate)', async () => {
            const realmId = randomUUID();
            repository.seed([buildKey({ realmId, priority: 3 })]);

            const entity = await service.create({ use: JWKUse.SIGNATURE, realmId }, createAllowAllActor());
            expect(entity.priority).toEqual(4);
        });

        it('defaults the realm to the actor realm', async () => {
            const actor = createMasterRealmActor();
            const entity = await service.create({ use: JWKUse.SIGNATURE }, actor);

            expect(entity.realmId).toEqual(actor.identity!.data.realmId);
        });

        it('rejects a realm-less create (keys are realm-bound)', async () => {
            await expect(service.create({ use: JWKUse.SIGNATURE }, createAllowAllActor()))
                .rejects.toThrow(/realm/i);
        });

        it('rejects a duplicate name per realm', async () => {
            const realmId = randomUUID();
            repository.seed([buildKey({ realmId, name: 'primary' })]);

            await expect(service.create({
                use: JWKUse.SIGNATURE,
                name: 'primary',
                realmId,
            }, createAllowAllActor())).rejects.toThrow();
        });

        it('rejects an actor without KEY_CREATE', async () => {
            expect.assertions(1);
            try {
                await service.create({ use: JWKUse.SIGNATURE, realmId: randomUUID() }, createDenyAllActor());
            } catch (e) {
                expect(isAuthupError(e)).toBeTruthy();
            }
        });

        it('runs the full KEY_CREATE evaluation with attributes', async () => {
            const actor = createAllowAllActor();
            await service.create({ use: JWKUse.SIGNATURE, realmId: randomUUID() }, actor);

            const call = actor.permissionEvaluator.evaluateCalls.find(
                (c) => c.name === PermissionName.KEY_CREATE,
            );
            expect(call).toBeDefined();
        });
    });

    describe('create — import', () => {
        it('accepts a matching certificate on an imported signature key', async () => {
            const entity = await service.create({
                use: JWKUse.SIGNATURE,
                decryptionKey: PRIVATE_KEY,
                encryptionKey: PUBLIC_KEY,
                certificate: CERTIFICATE,
                realmId: randomUUID(),
            }, createAllowAllActor());

            expect(entity.type).toEqual(JWKType.RSA);
            expect(entity.certificate).toEqual(CERTIFICATE);
            expect(entity.decryptionKey).toBeNull();
        });

        it('rejects a certificate that does not match the imported signature key', async () => {
            const options = AsymmetricKey.buildImportOptionsForJWTAlgorithm(JWTAlgorithm.RS256);
            const keyPair = await createAsymmetricKeyPair(options);

            await expect(service.create({
                use: JWKUse.SIGNATURE,
                decryptionKey: await new AsymmetricKey(keyPair.privateKey).toBase64(),
                encryptionKey: await new AsymmetricKey(keyPair.publicKey).toBase64(),
                certificate: CERTIFICATE,
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('rejects a certificate on generated key material', async () => {
            await expect(service.create({
                use: JWKUse.SIGNATURE,
                certificate: CERTIFICATE,
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('rejects a certificate on imported encryption key material', async () => {
            await expect(service.create({
                use: JWKUse.ENCRYPTION,
                decryptionKey: Buffer.alloc(32, 7).toString('base64'),
                certificate: CERTIFICATE,
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('imports an RSA key pair (pkcs8 + spki)', async () => {
            const options = AsymmetricKey.buildImportOptionsForJWTAlgorithm(JWTAlgorithm.RS256);
            const keyPair = await createAsymmetricKeyPair(options);

            const entity = await service.create({
                use: JWKUse.SIGNATURE,
                decryptionKey: await new AsymmetricKey(keyPair.privateKey).toBase64(),
                encryptionKey: await new AsymmetricKey(keyPair.publicKey).toBase64(),
                realmId: randomUUID(),
            }, createAllowAllActor());

            expect(entity.type).toEqual(JWKType.RSA);
            expect(entity.decryptionKey).toBeNull();
        });

        it('rejects a signature import without its public part', async () => {
            const options = AsymmetricKey.buildImportOptionsForJWTAlgorithm(JWTAlgorithm.RS256);
            const keyPair = await createAsymmetricKeyPair(options);

            await expect(service.create({
                use: JWKUse.SIGNATURE,
                decryptionKey: await new AsymmetricKey(keyPair.privateKey).toBase64(),
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toThrow(/public part/);
        });

        it('rejects garbage signature material', async () => {
            await expect(service.create({
                use: JWKUse.SIGNATURE,
                decryptionKey: Buffer.alloc(64, 1).toString('base64'),
                encryptionKey: Buffer.alloc(64, 2).toString('base64'),
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toThrow(/could not be imported/);
        });

        it('rejects a valid-format but MISMATCHED key pair', async () => {
            const options = AsymmetricKey.buildImportOptionsForJWTAlgorithm(JWTAlgorithm.RS256);
            const pairA = await createAsymmetricKeyPair(options);
            const pairB = await createAsymmetricKeyPair(options);

            await expect(service.create({
                use: JWKUse.SIGNATURE,
                decryptionKey: await new AsymmetricKey(pairA.privateKey).toBase64(),
                encryptionKey: await new AsymmetricKey(pairB.publicKey).toBase64(),
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toThrow(/do not form a pair/);
        });

        it('imports 32 base64 bytes as an encryption key', async () => {
            const entity = await service.create({
                use: JWKUse.ENCRYPTION,
                decryptionKey: Buffer.alloc(32, 7).toString('base64'),
                realmId: randomUUID(),
            }, createAllowAllActor());

            expect(entity.type).toEqual(JWKType.OCT);
            expect(entity.decryptionKey).toBeNull();
        });

        it('rejects enc material that is not 32 bytes', async () => {
            await expect(service.create({
                use: JWKUse.ENCRYPTION,
                decryptionKey: Buffer.alloc(16, 7).toString('base64'),
                realmId: randomUUID(),
            }, createAllowAllActor())).rejects.toThrow(/32 base64-encoded bytes/);
        });
    });

    describe('update', () => {
        it('updates name, priority and status — material and use stay immutable', async () => {
            const [seeded] = repository.seed([buildKey()]);

            const entity = await service.update(seeded.id, {
                name: 'renamed',
                priority: 9,
                status: KeyStatus.PASSIVE,
                use: JWKUse.ENCRYPTION,
                decryptionKey: 'evil',
                realmId: randomUUID(),
            }, createAllowAllActor());

            expect(entity.name).toEqual('renamed');
            expect(entity.priority).toEqual(9);
            expect(entity.status).toEqual(KeyStatus.PASSIVE);
            // CREATE-only mounts are stripped by the UPDATE group
            expect(entity.use).toEqual(JWKUse.SIGNATURE);
            expect(entity.realmId).toEqual(seeded.realmId);
        });

        it('rejects an unknown key', async () => {
            expect.assertions(1);
            try {
                await service.update(randomUUID(), { name: 'renamed' }, createAllowAllActor());
            } catch (e) {
                expect(isAuthupError(e) && e.code === ErrorCode.ENTITY_NOT_FOUND).toBeTruthy();
            }
        });
    });

    describe('delete', () => {
        it('deletes a signature key without reference counting', async () => {
            const [seeded] = repository.seed([buildKey()]);
            repository.blobReferences = 5;

            await service.delete(seeded.id, createAllowAllActor());
            expect(repository.getAll()).toHaveLength(0);
            expect(repository.countBlobReferencesCalls).toHaveLength(0);
        });

        it('refuses to delete a referenced enc key without force (409 + count)', async () => {
            const [seeded] = repository.seed([buildKey({ use: JWKUse.ENCRYPTION, type: JWKType.OCT })]);
            repository.blobReferences = 3;

            expect.assertions(3);
            try {
                await service.delete(seeded.id, createAllowAllActor());
            } catch (e) {
                expect(isAuthupError(e)).toBeTruthy();
                if (isAuthupError(e)) {
                    expect(e.code).toEqual(ErrorCode.ENTITY_CONFLICT);
                    expect(e.data).toEqual({ references: 3 });
                }
            }
        });

        it('crypto-shreds a referenced enc key with force', async () => {
            const [seeded] = repository.seed([buildKey({ use: JWKUse.ENCRYPTION, type: JWKType.OCT })]);
            repository.blobReferences = 3;

            await service.delete(seeded.id, createAllowAllActor(), { force: true });
            expect(repository.getAll()).toHaveLength(0);
        });

        it('deletes an unreferenced enc key without force', async () => {
            const [seeded] = repository.seed([buildKey({ use: JWKUse.ENCRYPTION, type: JWKType.OCT })]);
            repository.blobReferences = 0;

            await service.delete(seeded.id, createAllowAllActor());
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
            service = new KeyService({
                repository,
                eventService,
                requestContext: () => ({
                    actorType: null,
                    actorId: null,
                    actorName: null,
                    requestPath: '/keys',
                    requestMethod: 'POST',
                    requestIpAddress: '203.0.113.7',
                    requestUserAgent: 'vitest',
                }),
            });
        });

        it('records a metadata-only created event (never key material)', async () => {
            const actorId = randomUUID();
            const realmId = randomUUID();
            const entity = await service.create({ use: JWKUse.SIGNATURE, realmId }, buildActor(actorId));

            expect(eventService.recordCalls).toHaveLength(1);
            const [call] = eventService.recordCalls;
            expect(call).toMatchObject({
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                refType: EntityType.KEY,
                refId: entity.id,
                realmId,
                actorType: IdentityType.USER,
                actorId,
                actorName: 'admin',
                requestPath: '/keys',
                requestIpAddress: '203.0.113.7',
            });
            // exact payload — id/name/use/status metadata only
            expect(call.data).toEqual({
                name: entity.name,
                use: JWKUse.SIGNATURE,
                status: KeyStatus.ACTIVE,
            });
            const serialized = JSON.stringify(call);
            expect(serialized).not.toContain('decryptionKey');
            expect(serialized).not.toContain('encryptionKey');
            expect(serialized).not.toContain('certificate');
        });

        it('records an updated event carrying the scalar diff (status change)', async () => {
            const [seeded] = repository.seed([buildKey({ name: 'primary', status: KeyStatus.ACTIVE })]);

            await service.update(seeded.id, { status: KeyStatus.DISABLED }, buildActor(randomUUID()));

            expect(eventService.recordCalls).toHaveLength(1);
            const [call] = eventService.recordCalls;
            expect(call.name).toEqual(EventName.UPDATED);
            expect(call.data).toEqual({
                name: 'primary',
                use: JWKUse.SIGNATURE,
                status: KeyStatus.DISABLED,
                diff: { status: { next: KeyStatus.DISABLED, previous: KeyStatus.ACTIVE } },
            });
        });

        it('records an updated event without a diff when nothing changed', async () => {
            const [seeded] = repository.seed([buildKey()]);

            await service.update(seeded.id, {}, buildActor(randomUUID()));

            expect(eventService.recordCalls).toHaveLength(1);
            expect(eventService.recordCalls[0].data!.diff).toBeUndefined();
        });

        it('records a deleted event and flags a forced crypto-shred', async () => {
            const [seeded] = repository.seed([buildKey({ use: JWKUse.ENCRYPTION, type: JWKType.OCT })]);
            repository.blobReferences = 3;

            await service.delete(seeded.id, buildActor(randomUUID()), { force: true });

            expect(eventService.recordCalls).toHaveLength(1);
            const [call] = eventService.recordCalls;
            expect(call.name).toEqual(EventName.DELETED);
            expect(call.refId).toEqual(seeded.id);
            expect(call.data).toMatchObject({ use: JWKUse.ENCRYPTION, force: true });
        });

        it('records a plain deleted event without the force flag', async () => {
            const [seeded] = repository.seed([buildKey()]);

            await service.delete(seeded.id, buildActor(randomUUID()));

            expect(eventService.recordCalls).toHaveLength(1);
            expect(eventService.recordCalls[0].data!.force).toBeUndefined();
        });

        it('never flags a signature-key delete as a crypto-shred (force is enc-only)', async () => {
            const [seeded] = repository.seed([buildKey()]);

            await service.delete(seeded.id, buildActor(randomUUID()), { force: true });

            expect(eventService.recordCalls).toHaveLength(1);
            expect(eventService.recordCalls[0].data!.force).toBeUndefined();
        });

        it('records nothing when the mutation fails', async () => {
            await expect(service.update(randomUUID(), { name: 'renamed' }, buildActor(randomUUID())))
                .rejects.toThrow();
            const [seeded] = repository.seed([buildKey({ use: JWKUse.ENCRYPTION, type: JWKType.OCT })]);
            repository.blobReferences = 1;
            await expect(service.delete(seeded.id, buildActor(randomUUID())))
                .rejects.toThrow();

            expect(eventService.recordCalls).toHaveLength(0);
        });
    });
});
