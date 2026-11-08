/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import type { PermissionCompileResult } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import type { Client, ClientTokenExchangePolicy } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';
import { inArray } from '@rapiq/core';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ClientTokenExchangePolicyService } from '../../../../../src/core/entities/client-token-exchange-policy/service.ts';
import { readEvaluatedRecordRealms } from '../../helpers/index.ts';
import { FakeClientTokenExchangePolicyRepository } from './fake-repository.ts';

describe('core/entities/client-token-exchange-policy/service', () => {
    const clientRealmId = randomUUID();

    let repository: FakeClientTokenExchangePolicyRepository;
    let service: ClientTokenExchangePolicyService;

    function buildPayload(data: Record<string, unknown> = {}) {
        return {
            clientId: randomUUID(),
            audience: 'storage',
            capabilityTypes: 'bucket',
            maxLifetime: 3600,
            ...data,
        };
    }

    function seed(data: Partial<ClientTokenExchangePolicy> = {}) : ClientTokenExchangePolicy {
        return repository.seed({
            clientId: randomUUID(),
            audience: 'storage',
            capabilityTypes: 'bucket',
            maxLifetime: 3600,
            subjectRealmScope: 'own',
            realmId: clientRealmId,
            ...data,
        });
    }

    beforeEach(() => {
        repository = new FakeClientTokenExchangePolicyRepository();
        repository.onValidateJoinColumns((data) => {
            data.client = { realmId: clientRealmId } as Client;
        });
        service = new ClientTokenExchangePolicyService({ repository });
    });

    describe('getMany', () => {
        it('should pre-gate on the dedicated permissions only', async () => {
            const actor = createAllowAllActor();

            await service.getMany({}, actor);

            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_READ,
                    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE,
                    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_DELETE,
                ],
            });
        });

        it('should refuse an actor without a grant', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should drop rows out of reach on the per-row branch and correct the total', async () => {
            const actor = createAllowAllActor();
            const reached = seed();

            seed({ realmId: randomUUID() });

            actor.permissionEvaluator.setBehavior(({ method, ctx }) => {
                if (method === 'evaluateOneOf' && ctx.data?.get(BuiltInPolicyType.REALM_MATCH) !== clientRealmId) {
                    throw PermissionError.denied('out of reach');
                }
            });

            const { data, meta } = await service.getMany({}, actor);

            expect(data.map((row) => row.id)).toEqual([reached.id]);
            expect(meta.total).toEqual(1);
        });
    });

    describe('getOne', () => {
        it('should return the row and evaluate its realm', async () => {
            const entity = seed();
            const actor = createAllowAllActor();

            const result = await service.getOne(entity.id, actor);

            expect(result.id).toEqual(entity.id);
            expect(actor.permissionEvaluator.evaluateOneOfCalls.at(-1)?.data?.get(BuiltInPolicyType.REALM_MATCH)).toEqual(clientRealmId);
        });

        it('should answer not found for an unknown row', async () => {
            await expect(service.getOne(randomUUID(), createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should refuse an actor without a grant', async () => {
            await expect(service.getOne(seed().id, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('create', () => {
        it('should take the realm from the client and never from the body', async () => {
            const actor = createAllowAllActor();

            const entity = await service.create(buildPayload({ realmId: randomUUID() }), actor);

            expect(entity.realmId).toEqual(clientRealmId);
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_CREATE))
                .toEqual([clientRealmId]);
        });

        it('should default the subject realm scope to own', async () => {
            const entity = await service.create(buildPayload(), createAllowAllActor());

            expect(entity.subjectRealmScope).toEqual('own');
        });

        it('should keep an explicit subject realm scope for an unbounded grant', async () => {
            const actor = createAllowAllActor();

            actor.permissionEvaluator.setCompileResult({ verdict: 'allow' });

            const entity = await service.create(buildPayload({ subjectRealmScope: 'any' }), actor);

            expect(entity.subjectRealmScope).toEqual('any');
            expect(actor.permissionEvaluator.compileCalls.at(-1)?.name).toEqual(PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_CREATE);
        });

        it.each<[string, PermissionCompileResult]>([
            ['held at own reach', { verdict: 'post' }],
            ['narrowed by a policy', { verdict: 'conditional', condition: inArray('id', []) }],
        ])('should refuse scope any to a grant %s', async (_label, result) => {
            const actor = createAllowAllActor();

            actor.permissionEvaluator.setCompileResult(result);

            await expect(service.create(buildPayload({ subjectRealmScope: 'any' }), actor))
                .rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
            expect(await repository.findOneBy({ audience: 'storage' })).toBeNull();

            const own = await service.create(buildPayload({ subjectRealmScope: 'own' }), actor);

            expect(own.subjectRealmScope).toEqual('own');
        });

        it('should not carry the loaded client onto the row', async () => {
            const entity = await service.create(buildPayload(), createAllowAllActor());

            expect(entity).not.toHaveProperty('client');
        });

        it('should answer not found when the client did not load', async () => {
            repository.onValidateJoinColumns(() => {});

            await expect(service.create(buildPayload(), createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should conflict on the same client and audience', async () => {
            const clientId = randomUUID();

            await service.create(buildPayload({ clientId }), createAllowAllActor());

            await expect(service.create(buildPayload({ clientId }), createAllowAllActor()))
                .rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });

        it('should allow a second audience for the same client', async () => {
            const clientId = randomUUID();

            await service.create(buildPayload({ clientId }), createAllowAllActor());

            const second = await service.create(buildPayload({ clientId, audience: 'other' }), createAllowAllActor());

            expect(second.audience).toEqual('other');
        });

        it('should reject an invalid payload', async () => {
            await expect(service.create(buildPayload({ maxLifetime: 0 }), createAllowAllActor())).rejects.toThrow();
        });

        it('should refuse an actor without a grant before validating', async () => {
            await expect(service.create({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('update', () => {
        it('should evaluate the stored and the updated row', async () => {
            const entity = seed();
            const actor = createAllowAllActor();

            const result = await service.update(entity.id, { maxLifetime: 60 }, actor);

            expect(result.maxLifetime).toEqual(60);
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE))
                .toEqual([clientRealmId, clientRealmId]);
        });

        it('should allow widening to scope any for an unbounded grant', async () => {
            const entity = seed();
            const actor = createAllowAllActor();

            actor.permissionEvaluator.setCompileResult({ verdict: 'allow' });

            const result = await service.update(entity.id, { subjectRealmScope: 'any' }, actor);

            expect(result.subjectRealmScope).toEqual('any');
        });

        it.each<[string, PermissionCompileResult]>([
            ['held at own reach', { verdict: 'post' }],
            ['narrowed by a policy', { verdict: 'conditional', condition: inArray('id', []) }],
        ])('should refuse widening to scope any for a grant %s', async (_label, result) => {
            const entity = seed();
            const actor = createAllowAllActor();

            actor.permissionEvaluator.setCompileResult(result);

            await expect(service.update(entity.id, { subjectRealmScope: 'any' }, actor))
                .rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should leave the client and the realm as stored', async () => {
            const entity = seed();
            const { clientId } = entity;

            const result = await service.update(entity.id, {
                clientId: randomUUID(),
                realmId: randomUUID(),
                maxLifetime: 60,
            }, createAllowAllActor());

            expect(result.clientId).toEqual(clientId);
            expect(result.realmId).toEqual(clientRealmId);
        });

        it('should conflict when the new audience is taken on the same client', async () => {
            const clientId = randomUUID();

            seed({ clientId, audience: 'taken' });

            const entity = seed({ clientId, audience: 'free' });

            await expect(service.update(entity.id, { audience: 'taken' }, createAllowAllActor()))
                .rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });

        it('should not conflict with itself', async () => {
            const entity = seed();

            const result = await service.update(entity.id, { audience: entity.audience }, createAllowAllActor());

            expect(result.id).toEqual(entity.id);
        });

        it('should answer not found for an unknown row', async () => {
            await expect(service.update(randomUUID(), { maxLifetime: 60 }, createAllowAllActor()))
                .rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should refuse an actor without a grant', async () => {
            await expect(service.update(seed().id, { maxLifetime: 60 }, createDenyAllActor()))
                .rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('delete', () => {
        it('should remove the row and return it with its id', async () => {
            const entity = seed();
            const actor = createAllowAllActor();

            const result = await service.delete(entity.id, actor);

            expect(result.id).toEqual(entity.id);
            await expect(repository.findOneBy({ id: entity.id })).resolves.toBeNull();
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_DELETE))
                .toEqual([clientRealmId]);
        });

        it('should answer not found for an unknown row', async () => {
            await expect(service.delete(randomUUID(), createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should refuse an actor without a grant', async () => {
            await expect(service.delete(seed().id, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });
});
