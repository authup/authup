/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import {
    FilterCompoundOperator,
    eq,
    isFilter,
    isFilters,
} from '@rapiq/core';
import { PermissionName } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { describe, expect, it } from 'vitest';
import { roleSchema } from '../../../../src/core/entities/role/schema.ts';
import { userRoleSchema } from '../../../../src/core/entities/user-role/schema.ts';
import { appendQueryConditions, decodeQuery } from '../../../../src/core/query/index.ts';

function collectFieldConditions(condition: ICondition): [string, unknown][] {
    if (isFilters(condition)) {
        return condition.value.flatMap((child) => collectFieldConditions(child));
    }

    if (isFilter(condition)) {
        return [[condition.field, condition.value]];
    }

    return [];
}

function buildActor(evaluator: FakePermissionEvaluator): ActorContext {
    return { permissionEvaluator: evaluator };
}

describe('core/query', () => {
    it('should decode bracket and expression dialects into the same condition', async () => {
        const bracket = await decodeQuery({ filter: { name: 'admin' } }, { schema: roleSchema });
        const expression = await decodeQuery(
            { codec: 'url-expression', filter: "eq(name,'admin')" },
            { schema: roleSchema },
        );

        expect(collectFieldConditions(bracket.filters)).toEqual([['name', 'admin']]);
        expect(collectFieldConditions(expression.filters)).toEqual([['name', 'admin']]);
    });

    it('should neither parse nor default masked parameters', async () => {
        const parsed = await decodeQuery(
            { filter: { name: 'admin' }, page: { limit: 10 } },
            { schema: roleSchema, parameters: ['filters'] },
        );

        expect(collectFieldConditions(parsed.filters)).toEqual([['name', 'admin']]);
        expect(parsed.pagination.limit).toBeUndefined();
        expect(parsed.pagination.offset).toBeUndefined();
    });

    it('should append conditions without displacing client conditions', async () => {
        const parsed = await decodeQuery({ filter: { realmId: 'client-realm' } }, { schema: roleSchema });

        const result = appendQueryConditions(parsed, eq('realmId', 'route-realm'));

        expect(isFilters(result.filters, FilterCompoundOperator.AND)).toBe(true);
        expect(collectFieldConditions(result.filters)).toEqual([
            ['realmId', 'client-realm'],
            ['realmId', 'route-realm'],
        ]);
        // immutable: the input query keeps its own filter tree
        expect(collectFieldConditions(parsed.filters)).toEqual([['realmId', 'client-realm']]);
    });

    it('should append onto an empty filter tree', async () => {
        const parsed = await decodeQuery({}, { schema: roleSchema });

        const result = appendQueryConditions(parsed, eq('realmId', 'route-realm'));

        expect(collectFieldConditions(result.filters)).toEqual([['realmId', 'route-realm']]);
    });

    it('should carry the other parameter nodes over by reference', async () => {
        const parsed = await decodeQuery(
            { page: { limit: 10 }, sort: '-name' },
            { schema: roleSchema },
        );

        const result = appendQueryConditions(parsed, eq('realmId', 'route-realm'));

        expect(result).not.toBe(parsed);
        expect(result.fields).toBe(parsed.fields);
        expect(result.relations).toBe(parsed.relations);
        expect(result.pagination).toBe(parsed.pagination);
        expect(result.sorts).toBe(parsed.sorts);
        expect(result.pagination.limit).toEqual(10);
    });

    describe('relations read gate', () => {
        it('should keep includes for an actor passing the target read gate', async () => {
            const evaluator = new FakePermissionEvaluator();

            const parsed = await decodeQuery(
                { include: 'user,role' },
                { schema: userRoleSchema, actor: buildActor(evaluator) },
            );

            expect(parsed.relations.value.map((relation) => relation.name)).toEqual(['user', 'role']);
            expect(evaluator.preEvaluateOneOfCalls.map((call) => call.name)).toEqual([
                [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
                [
                    PermissionName.ROLE_READ,
                    PermissionName.ROLE_UPDATE,
                    PermissionName.ROLE_DELETE,
                ],
            ]);
        });

        it('should strip includes whose target read gate settles false', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.deny('preEvaluateOneOf');

            const parsed = await decodeQuery(
                { include: 'user,role', filter: { userId: 'foo' } },
                { schema: userRoleSchema, actor: buildActor(evaluator) },
            );

            // fail-soft: the include is dropped, the rest of the query survives
            expect(parsed.relations.value).toEqual([]);
            expect(collectFieldConditions(parsed.filters)).toEqual([['userId', 'foo']]);
        });

        it('should strip only the denied include', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.setBehavior(({ ctx }) => {
                const names = Array.isArray(ctx.name) ? ctx.name : [ctx.name];
                if (names.includes(PermissionName.USER_READ)) {
                    throw new Error('denied');
                }
            });

            const parsed = await decodeQuery(
                { include: 'user,role' },
                { schema: userRoleSchema, actor: buildActor(evaluator) },
            );

            expect(parsed.relations.value.map((relation) => relation.name)).toEqual(['role']);
        });

        it('should prune dotted keys riding a denied include', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.deny('preEvaluateOneOf');

            const parsed = await decodeQuery(
                { include: 'user', filter: { 'user.name': 'admin' } },
                { schema: userRoleSchema, actor: buildActor(evaluator) },
            );

            expect(parsed.relations.value).toEqual([]);
            expect(collectFieldConditions(parsed.filters)).toEqual([]);
        });

        it('should gate a relation reached only via a dotted filter key (rapiq#815)', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.deny('preEvaluateOneOf');

            // `user.name` resolves through schemaMapping to the user schema's
            // `name` allow-list and would auto-join `user` — with NO explicit
            // include. Pre-beta.7 this bypassed the read gate; now the traversed
            // relation records an authorization obligation and the key is pruned.
            const parsed = await decodeQuery(
                { filter: { 'user.name': 'admin' } },
                { schema: userRoleSchema, actor: buildActor(evaluator) },
            );

            expect(collectFieldConditions(parsed.filters)).toEqual([]);
            expect(parsed.relations.value).toEqual([]);
            // the gate was consulted for the USER target, not the allow-list
            expect(evaluator.preEvaluateOneOfCalls.map((call) => call.name)).toEqual([
                [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
            ]);
        });

        it('should keep a dotted filter key when its relation gate passes', async () => {
            const evaluator = new FakePermissionEvaluator();

            const parsed = await decodeQuery(
                { filter: { 'user.name': 'admin' } },
                { schema: userRoleSchema, actor: buildActor(evaluator) },
            );

            const conditions = collectFieldConditions(parsed.filters);
            expect(conditions).toHaveLength(1);
            expect(conditions[0][1]).toEqual('admin');
            expect(evaluator.preEvaluateOneOfCalls).toHaveLength(1);
        });

        it('should not gate an ungated target', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.denyAll();

            const parsed = await decodeQuery(
                { include: 'realm' },
                { schema: roleSchema, actor: buildActor(evaluator) },
            );

            expect(parsed.relations.value.map((relation) => relation.name)).toEqual(['realm']);
            expect(evaluator.preEvaluateOneOfCalls).toEqual([]);
        });

        it('should run an actor-less (system) decode unrestricted', async () => {
            const parsed = await decodeQuery(
                { include: 'user,role' },
                { schema: userRoleSchema },
            );

            expect(parsed.relations.value.map((relation) => relation.name)).toEqual(['user', 'role']);
        });
    });
});
