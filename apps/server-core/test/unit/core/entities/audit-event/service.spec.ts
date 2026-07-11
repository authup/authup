/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { AuditEvent, User } from '@authup/core-kit';
import { AuditEventName, AuditEventScope, IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { AuditEventService } from '../../../../../src/core/entities/audit-event/service.ts';
import type { AuditEventServiceOptions } from '../../../../../src/core/index.ts';
import { FakeAuditEventRepository } from './fake-repository.ts';

const DAY_IN_MS = 86_400_000;

const realmId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();

function makeActor(options: { allow: boolean, identity?: boolean } = { allow: true }): ActorContext {
    const evaluator = new FakePermissionEvaluator();
    if (!options.allow) {
        evaluator.denyAll();
    }

    const actor: ActorContext = { permissionEvaluator: evaluator };
    if (options.identity !== false) {
        actor.identity = {
            type: IdentityType.USER,
            data: {
                id: userId,
                realm_id: realmId,
            } as User,
        };
    }

    return actor;
}

describe('AuditEventService', () => {
    let repository: FakeAuditEventRepository;
    let service: AuditEventService;

    beforeEach(() => {
        repository = new FakeAuditEventRepository();
        service = new AuditEventService({ repository });
    });

    function buildService(options: AuditEventServiceOptions): AuditEventService {
        return new AuditEventService({ repository, options });
    }

    function seedOwn(data: Partial<AuditEvent> = {}): AuditEvent {
        return repository.seed({
            scope: AuditEventScope.OAUTH2,
            name: AuditEventName.LOGIN,
            actor_type: IdentityType.USER,
            actor_id: userId,
            realm_id: realmId,
            ...data,
        });
    }

    function seedForeign(data: Partial<AuditEvent> = {}): AuditEvent {
        return repository.seed({
            scope: AuditEventScope.OAUTH2,
            name: AuditEventName.LOGIN,
            actor_type: IdentityType.USER,
            actor_id: otherUserId,
            realm_id: realmId,
            ...data,
        });
    }

    describe('record', () => {
        it('persists a row with a generated id', async () => {
            await service.record({
                scope: AuditEventScope.OAUTH2,
                name: AuditEventName.LOGIN,
                actorType: IdentityType.USER,
                actorId: userId,
                actorName: 'test-user',
                realmId,
            });

            expect(repository.rows).toHaveLength(1);
            const [row] = repository.rows;
            expect(row.id).toBeTypeOf('string');
            expect(row.id.length).toBeGreaterThan(0);
            expect(row.scope).toEqual(AuditEventScope.OAUTH2);
            expect(row.name).toEqual(AuditEventName.LOGIN);
            expect(row.actor_type).toEqual(IdentityType.USER);
            expect(row.actor_id).toEqual(userId);
            expect(row.actor_name).toEqual('test-user');
            expect(row.realm_id).toEqual(realmId);
        });

        it('strips secrets from the context data via the sanitizer', async () => {
            await service.record({
                scope: AuditEventScope.OAUTH2,
                name: AuditEventName.LOGIN_FAILED,
                data: {
                    grant_type: 'password',
                    error_code: 'entity_credentials_invalid',
                    password: 'super-secret',
                    client_secret: 'also-secret',
                },
            });

            expect(repository.rows).toHaveLength(1);
            expect(repository.rows[0].data).toEqual({
                grant_type: 'password',
                error_code: 'entity_credentials_invalid',
            });
        });

        it('stamps expires_at from the configured retention window', async () => {
            const retentionDays = 30;
            await buildService({ retentionDays }).record({
                scope: AuditEventScope.OAUTH2,
                name: AuditEventName.LOGIN,
            });

            const [row] = repository.rows;
            expect(row.expires_at).not.toBeNull();
            const delta = new Date(row.expires_at!).getTime() -
                (Date.now() + (retentionDays * DAY_IN_MS));
            expect(Math.abs(delta)).toBeLessThan(60_000);
        });

        it('defaults the retention to 365 days', async () => {
            await service.record({
                scope: AuditEventScope.OAUTH2,
                name: AuditEventName.LOGIN,
            });

            const [row] = repository.rows;
            expect(row.expires_at).not.toBeNull();
            const delta = new Date(row.expires_at!).getTime() -
                (Date.now() + (365 * DAY_IN_MS));
            expect(Math.abs(delta)).toBeLessThan(60_000);
        });

        it('keeps rows forever when retentionDays is 0', async () => {
            await buildService({ retentionDays: 0 }).record({
                scope: AuditEventScope.OAUTH2,
                name: AuditEventName.LOGIN,
            });

            expect(repository.rows).toHaveLength(1);
            expect(repository.rows[0].expires_at).toBeNull();
        });

        it('persists nothing when disabled', async () => {
            await buildService({ enabled: false }).record({
                scope: AuditEventScope.OAUTH2,
                name: AuditEventName.LOGIN,
            });

            expect(repository.rows).toHaveLength(0);
        });

        it('resolves without throwing when the repository save fails (fire-and-forget)', async () => {
            repository.saveError = new Error('database unavailable');

            await expect(service.record({
                scope: AuditEventScope.OAUTH2,
                name: AuditEventName.LOGIN,
            })).resolves.toBeUndefined();

            expect(repository.rows).toHaveLength(0);
        });
    });

    describe('getMany', () => {
        it('scopes an actor without audit_read to its own rows', async () => {
            seedOwn();
            seedOwn();
            const foreign = seedForeign();

            const actor = makeActor({ allow: false });
            const { data } = await service.getMany({}, actor);

            expect(data).toHaveLength(2);
            expect(data.every((row) => row.actor_id === userId)).toBe(true);
            expect(data.some((row) => row.id === foreign.id)).toBe(false);
        });

        it('rejects an anonymous (identity-less) actor without the read permission', async () => {
            const actor = makeActor({ allow: false, identity: false });
            await expect(service.getMany({}, actor)).rejects.toBeDefined();
        });

        it('returns all rows for a permitted actor', async () => {
            seedOwn();
            seedForeign();

            const actor = makeActor({ allow: true });
            const { data, meta } = await service.getMany({}, actor);

            expect(data).toHaveLength(2);
            expect(meta.total).toEqual(2);
        });

        it('drops rows a privileged actor is not authorized for (realm reach)', async () => {
            seedOwn();
            seedForeign();
            seedForeign();

            // preEvaluate passes (holds the permission) but per-row evaluate denies
            const evaluator = new FakePermissionEvaluator();
            evaluator.deny('evaluate');
            const actor: ActorContext = {
                permissionEvaluator: evaluator,
                identity: { type: IdentityType.USER, data: { id: userId, realm_id: realmId } as User },
            };

            const { data, meta } = await service.getMany({}, actor);

            // only the actor's own rows survive (owned rows skip the evaluate)
            expect(data).toHaveLength(1);
            expect(data[0].actor_id).toEqual(userId);
            expect(meta.total).toEqual(1);
        });
    });

    describe('getOne', () => {
        it('returns an own row with no permission check', async () => {
            const row = seedOwn();
            const actor = makeActor({ allow: false });

            const result = await service.getOne(row.id, actor);
            expect(result.id).toEqual(row.id);
            expect((actor.permissionEvaluator as FakePermissionEvaluator).preEvaluateCalls).toHaveLength(0);
        });

        it("denies reading another actor's row without permission", async () => {
            const row = seedForeign();
            const actor = makeActor({ allow: false });

            await expect(service.getOne(row.id, actor)).rejects.toBeDefined();
        });

        it("allows a privileged actor to read another actor's row", async () => {
            const row = seedForeign();
            const actor = makeActor({ allow: true });

            const result = await service.getOne(row.id, actor);
            expect(result.id).toEqual(row.id);
        });

        it('throws when the row does not exist', async () => {
            const actor = makeActor({ allow: true });
            await expect(service.getOne(randomUUID(), actor)).rejects.toBeDefined();
        });
    });

    it('exposes a read/record-only surface (append-only log)', () => {
        // the log is append-only: writes happen via record(), pruning via the
        // retention sweep — the service must not grow mutation methods.
        const methods = Object.getOwnPropertyNames(AuditEventService.prototype);
        expect(methods).not.toContain('create');
        expect(methods).not.toContain('update');
        expect(methods).not.toContain('save');
        expect(methods).not.toContain('delete');
    });
});
