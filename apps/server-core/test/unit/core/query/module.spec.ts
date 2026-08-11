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
import { IdentityType, PermissionName } from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { clientSchema } from '../../../../src/core/entities/client/schema.ts';
import { clientPermissionSchema } from '../../../../src/core/entities/client-permission/schema.ts';
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

    describe('fields read gate (client secret, #3322)', () => {
        const CLIENT_PERMISSIONS = [
            PermissionName.CLIENT_READ,
            PermissionName.CLIENT_UPDATE,
            PermissionName.CLIENT_DELETE,
        ];

        const findField = (parsed: Awaited<ReturnType<typeof decodeQuery>>, name: string) => parsed.fields.value
            .find((field) => field.name === name);

        it('should keep the secret unconditioned for an allow verdict', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.setCompileResult({ verdict: 'allow' });

            const parsed = await decodeQuery(
                { fields: '+secret' },
                { schema: clientSchema, actor: buildActor(evaluator) },
            );

            const field = findField(parsed, 'secret');
            expect(field).toBeDefined();
            expect(field!.condition).toBeUndefined();
            expect(evaluator.compileCalls.map((call) => call.name)).toEqual([CLIENT_PERMISSIONS]);
        });

        it('should attach a fail-closed condition for a conditional verdict', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.setCompileResult({
                verdict: 'conditional',
                condition: eq('realmId', 'realm-a'),
            });

            const parsed = await decodeQuery(
                { fields: '+secret' },
                { schema: clientSchema, actor: buildActor(evaluator) },
            );

            const field = findField(parsed, 'secret');
            expect(field!.condition).toBeDefined();
            // realm presence guard, non-plaintext legs, then the compiled leg
            expect(collectFieldConditions(field!.condition!)).toEqual([
                ['realmId', null],
                ['secret', null],
                ['secretHashed', true],
                ['secretEncrypted', true],
                ['realmId', 'realm-a'],
            ]);
        });

        it('should gate plaintext values without a permission leg on a non-lowerable (post) verdict', async () => {
            const evaluator = new FakePermissionEvaluator();

            const parsed = await decodeQuery(
                { fields: '+secret' },
                { schema: clientSchema, actor: buildActor(evaluator) },
            );

            const field = findField(parsed, 'secret');
            expect(collectFieldConditions(field!.condition!)).toEqual([
                ['realmId', null],
                ['secret', null],
                ['secretHashed', true],
                ['secretEncrypted', true],
            ]);
        });

        it('should keep a client identity\'s own row visible via a self leg', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.setCompileResult({ verdict: 'deny' });
            const selfId = randomUUID();

            const actor: ActorContext = {
                permissionEvaluator: evaluator,
                identity: {
                    type: IdentityType.CLIENT,
                    data: { id: selfId } as Client,
                },
            };

            const parsed = await decodeQuery(
                { fields: '+secret' },
                { schema: clientSchema, actor },
            );

            const field = findField(parsed, 'secret');
            expect(collectFieldConditions(field!.condition!)).toEqual([
                ['realmId', null],
                ['secret', null],
                ['secretHashed', true],
                ['secretEncrypted', true],
                ['id', selfId],
            ]);
        });

        it('should gate the secret at the include position of another schema', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.setCompileResult({
                verdict: 'conditional',
                condition: eq('realmId', 'realm-a'),
            });

            const parsed = await decodeQuery(
                { include: 'client', fields: { client: 'secret' } },
                { schema: clientPermissionSchema, actor: buildActor(evaluator) },
            );

            const field = findField(parsed, 'client.secret');
            expect(field).toBeDefined();
            expect(field!.condition).toBeDefined();
            expect(collectFieldConditions(field!.condition!)).toContainEqual(['realmId', 'realm-a']);
            expect(evaluator.compileCalls.map((call) => call.name)).toEqual([CLIENT_PERMISSIONS]);
        });

        it('should not fire for a projection without gated fields', async () => {
            const evaluator = new FakePermissionEvaluator();

            const parsed = await decodeQuery(
                { fields: 'id,name' },
                { schema: clientSchema, actor: buildActor(evaluator) },
            );

            expect(findField(parsed, 'name')).toBeDefined();
            expect(evaluator.compileCalls).toHaveLength(0);
        });

        it('should not fire for the default projection', async () => {
            const evaluator = new FakePermissionEvaluator();

            const parsed = await decodeQuery(
                {},
                { schema: clientSchema, actor: buildActor(evaluator) },
            );

            expect(findField(parsed, 'secret')).toBeUndefined();
            expect(evaluator.compileCalls).toHaveLength(0);
        });

        it('should run an actor-less (system) decode unrestricted', async () => {
            const parsed = await decodeQuery(
                { fields: '+secret' },
                { schema: clientSchema },
            );

            const field = findField(parsed, 'secret');
            expect(field).toBeDefined();
            expect(field!.condition).toBeUndefined();
        });

        it('should strip the field when the gate itself fails', async () => {
            const evaluator = new FakePermissionEvaluator();
            evaluator.compile = async () => {
                throw new Error('compile failed');
            };

            const parsed = await decodeQuery(
                { fields: '+secret' },
                { schema: clientSchema, actor: buildActor(evaluator) },
            );

            expect(findField(parsed, 'secret')).toBeUndefined();
        });
    });

    // Schema index declarations (rapiq 2.0.0-beta.20): filters run in
    // anchor mode, sort keys must equal a leftmost prefix of one declared
    // index. Every allowed filter/sort key leads a declared index, so
    // enforcement never rejects a query the allow-lists permit — the
    // observable narrowing is multi-key sorts without a matching
    // composite, which drop whole-parameter (fail-soft).
    describe('indexed enforcement', () => {
        it('should keep an allowed single-key filter and sort', async () => {
            const parsed = await decodeQuery(
                { filter: { builtIn: 'true' }, sort: '-createdAt' },
                { schema: roleSchema },
            );

            expect(collectFieldConditions(parsed.filters)).toEqual([['builtIn', true]]);
            expect(parsed.sorts.value).toHaveLength(1);
        });

        it('should drop a multi-key sort no declared composite serves', async () => {
            const parsed = await decodeQuery(
                { sort: '-createdAt,name' },
                { schema: roleSchema },
            );

            expect(parsed.sorts.value).toHaveLength(0);
        });

        it('should describe the declared indexes', () => {
            const description = roleSchema.describe();

            expect(description.indexes).toContainEqual(['name', 'clientId', 'realmId']);
            expect(description.filters!.indexed).toEqual('anchor');
            expect(description.sort!.indexed).toBe(true);
        });
    });
});
