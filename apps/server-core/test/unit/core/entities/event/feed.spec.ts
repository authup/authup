/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionError } from '@authup/access';
import type { User } from '@authup/core-kit';
import { EventScope, IdentityType } from '@authup/core-kit';
import { buildUUIDv7LowerBound } from '@authup/kit';
import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { eq } from '@rapiq/core';
import type { ICondition, IQuery } from '@rapiq/core';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { EventService } from '../../../../../src/core/entities/event/service.ts';
import { FakeEventRepository } from './fake-repository.ts';

const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);

type Leaf = {
    operator: string,
    field: string,
    value: unknown
};

function collectLeaves(condition: ICondition, output: Leaf[] = []): Leaf[] {
    if ('field' in condition) {
        output.push({
            operator: condition.operator,
            field: (condition as { field: string }).field,
            value: condition.value,
        });

        return output;
    }

    if (Array.isArray(condition.value)) {
        for (const child of condition.value as ICondition[]) {
            collectLeaves(child, output);
        }
    }

    return output;
}

describe('EventService.getFeed', () => {
    let repository: FakeEventRepository;
    let evaluator: FakePermissionEvaluator;
    let actor: ActorContext;

    beforeEach(() => {
        repository = new FakeEventRepository();
        evaluator = new FakePermissionEvaluator();
        actor = {
            permissionEvaluator: evaluator,
            identity: {
                type: IdentityType.USER,
                data: { id: randomUUID(), realmId: randomUUID() } as User,
            },
        };
    });

    function buildService(feedSettleSeconds?: number) {
        return new EventService({
            repository,
            clock: () => NOW,
            options: typeof feedSettleSeconds === 'number' ? { feedSettleSeconds } : {},
        });
    }

    function spyFindMany() {
        return vi.spyOn(repository, 'findMany');
    }

    it('refuses a reach that compiles to a per-row check, without reading', async () => {
        const findMany = spyFindMany();

        await expect(buildService().getFeed({}, actor)).rejects.toThrow(PermissionError);
        expect(findMany).not.toHaveBeenCalled();
    });

    it('refuses an actor without EVENT_READ before decoding the query', async () => {
        evaluator.deny('preEvaluate');

        const findMany = spyFindMany();

        await expect(buildService().getFeed({ filter: { unknownKey: 'x' } }, actor))
            .rejects.toThrow(PermissionError);
        expect(evaluator.compileCalls).toHaveLength(0);
        expect(findMany).not.toHaveBeenCalled();
    });

    it.each([
        { verdict: 'allow' as const },
        { verdict: 'conditional' as const, condition: eq('realmId', randomUUID()) },
    ])('pins scope, settle bound and id order ($verdict)', async (result) => {
        evaluator.setCompileResult(result);

        const findMany = spyFindMany();

        await buildService(30).getFeed({ sort: '-createdAt', filter: { scope: EventScope.OAUTH2 } }, actor);

        expect(findMany).toHaveBeenCalledTimes(1);

        const query = findMany.mock.calls[0][0] as IQuery;
        const leaves = collectLeaves(query.filters);

        expect(leaves).toContainEqual({
            operator: 'eq',
            field: 'scope',
            value: EventScope.ENTITY,
        });
        expect(leaves).toContainEqual({
            operator: 'lt',
            field: 'id',
            value: buildUUIDv7LowerBound(NOW - 30_000),
        });
        expect(query.sorts.value.map((sort) => [sort.name, sort.operator])).toEqual([['id', 'ASC']]);
    });

    it('withholds changes younger than the settle window', async () => {
        evaluator.setCompileResult({ verdict: 'allow' });

        const settled = repository.seed({ id: buildUUIDv7LowerBound(NOW - 11_000), scope: EventScope.ENTITY });

        repository.seed({ id: buildUUIDv7LowerBound(NOW - 9_000), scope: EventScope.ENTITY });

        const { data } = await buildService(10).getFeed({}, actor);

        expect(data.map((row) => row.id)).toEqual([settled.id]);
    });
});
