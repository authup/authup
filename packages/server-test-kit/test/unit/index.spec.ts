/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Query } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import {
    FakeEntityRepository,
    FakePermissionEvaluator,
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
    createNonMasterRealmActor,
} from '../../src';

describe('FakeEntityRepository', () => {
    it('seeds and retrieves entities', async () => {
        const repo = new FakeEntityRepository<{ id: string; name: string }>();
        repo.seed({ id: 'a', name: 'foo' });
        repo.seed({ id: 'b', name: 'bar' });

        const found = await repo.findOneById('a');
        expect(found).toEqual({ id: 'a', name: 'foo' });

        const byName = await repo.findOneByName('bar');
        expect(byName).toEqual({ id: 'b', name: 'bar' });

        const all = repo.getAll();
        expect(all).toHaveLength(2);
    });

    it('returns null for missing entities', async () => {
        const repo = new FakeEntityRepository<{ id: string }>();
        const result = await repo.findOneById('missing');
        expect(result).toBeNull();
    });

    it('paginates findMany with total count', async () => {
        const repo = new FakeEntityRepository<{ id: string }>();
        repo.seed([{ id: '1' }, { id: '2' }, { id: '3' }]);
        const { data, meta } = await repo.findMany(new Query({}));
        expect(data).toHaveLength(3);
        expect(meta.total).toBe(3);
    });

    it('removes entities', async () => {
        const repo = new FakeEntityRepository<{ id: string }>();
        const seeded = repo.seed({ id: 'x' });
        await repo.remove(seeded);
        expect(await repo.findOneById('x')).toBeNull();
    });
});

describe('FakePermissionEvaluator', () => {
    it('records evaluation calls', async () => {
        const evaluator = new FakePermissionEvaluator();
        await evaluator.evaluate({ name: 'foo' });
        await evaluator.preEvaluate({ name: 'bar' });
        expect(evaluator.evaluateCalls).toHaveLength(1);
        expect(evaluator.preEvaluateCalls).toHaveLength(1);
    });

    it('denyAll throws for every call', async () => {
        const evaluator = new FakePermissionEvaluator();
        evaluator.denyAll();
        await expect(evaluator.evaluate({ name: 'foo' })).rejects.toThrow();
        await expect(evaluator.preEvaluate({ name: 'bar' })).rejects.toThrow();
    });

    it('deny scopes denial to one method', async () => {
        const evaluator = new FakePermissionEvaluator();
        evaluator.deny('evaluate');
        await expect(evaluator.evaluate({ name: 'foo' })).rejects.toThrow();
        await expect(evaluator.preEvaluate({ name: 'bar' })).resolves.toBeUndefined();
    });
});

describe('actor factories', () => {
    it('createAllowAllActor returns an actor without an identity', () => {
        const actor = createAllowAllActor();
        expect(actor.permissionEvaluator).toBeInstanceOf(FakePermissionEvaluator);
        expect(actor.identity).toBeUndefined();
    });

    it('createDenyAllActor sets the evaluator to deny every call', async () => {
        const actor = createDenyAllActor();
        await expect(actor.permissionEvaluator.evaluate({ name: 'x' })).rejects.toThrow();
    });

    it('createMasterRealmActor sets master realm identity', () => {
        const actor = createMasterRealmActor();
        expect(actor.identity?.data.realm?.name).toBe('master');
    });

    it('createNonMasterRealmActor sets a non-master realm identity', () => {
        const actor = createNonMasterRealmActor();
        expect(actor.identity?.data.realm?.name).toBe('test-realm');
    });
});
