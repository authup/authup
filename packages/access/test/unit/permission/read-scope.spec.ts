/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Field,
    Fields,
    FilterCompoundOperator,
    Query,
    and,
    eq,
    inArray,
    isFilter,
    isFilters,
    or,
} from '@rapiq/core';
import type { ICondition, IQuery } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import type {
    IPermissionEvaluator,
    PermissionCompileContext,
    PermissionCompileResult,
    PermissionEvaluationContext,
} from '../../../src/index.ts';
import {
    PermissionError,
    appendQueryConditions,
    createAuthorizationEvaluator,
    narrowReadScope,
    scopeReadQuery,
} from '../../../src/index.ts';

class RecordingEvaluator implements IPermissionEvaluator {
    preEvaluateOneOfCalls: PermissionEvaluationContext[] = [];

    compileCalls: PermissionCompileContext[] = [];

    constructor(
        protected result: PermissionCompileResult = { verdict: 'post' },
        protected allow = true,
    ) {}

    async evaluate(): Promise<void> {
        return Promise.resolve();
    }

    async evaluateOneOf(): Promise<void> {
        return Promise.resolve();
    }

    async preEvaluate(): Promise<void> {
        return Promise.resolve();
    }

    async preEvaluateOneOf(ctx: PermissionEvaluationContext): Promise<void> {
        this.preEvaluateOneOfCalls.push(ctx);

        if (!this.allow) {
            throw PermissionError.deniedAll(Array.isArray(ctx.name) ? ctx.name : [ctx.name]);
        }
    }

    async compile(ctx: PermissionCompileContext): Promise<PermissionCompileResult> {
        this.compileCalls.push(ctx);

        return this.result;
    }
}

const NAMES = ['post_read', 'post_update'];

const ownership = eq('id', 'u1');

function collect(condition: ICondition): [string, unknown][] {
    if (isFilters(condition)) {
        return condition.value.flatMap((child) => collect(child));
    }

    if (isFilter(condition)) {
        return [[condition.field, condition.value]];
    }

    return [];
}

describe('appendQueryConditions', () => {
    it('ANDs the conditions onto the client filter, never in place', () => {
        const query = new Query({});
        const client = appendQueryConditions(query, eq('name', 'admin'));
        const result = appendQueryConditions(client, eq('realmId', 'r1'));

        expect(isFilters(result.filters, FilterCompoundOperator.AND)).toBe(true);
        expect(collect(result.filters)).toEqual([['name', 'admin'], ['realmId', 'r1']]);
        expect(collect(client.filters)).toEqual([['name', 'admin']]);
        expect(result.fields).toBe(client.fields);
        expect(result.pagination).toBe(client.pagination);
        expect(result.sorts).toBe(client.sorts);
        expect(result.relations).toBe(client.relations);
    });
});

describe('scopeReadQuery', () => {
    it('passes the query through on allow', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'allow' });
        const query = new Query({});

        expect(await scopeReadQuery(query, evaluator, { names: NAMES, ownership })).toEqual({
            query,
            post: false,
            ownership,
        });
        expect(evaluator.preEvaluateOneOfCalls.map((call) => call.name)).toEqual([NAMES]);
        expect(evaluator.compileCalls.map((call) => call.name)).toEqual([NAMES]);
    });

    it('ORs the ownership term into a conditional reach', async () => {
        const condition = eq('realmId', 'r1');
        const evaluator = new RecordingEvaluator({ verdict: 'conditional', condition });
        const query = new Query({});

        const scope = await scopeReadQuery(query, evaluator, { names: NAMES, ownership });

        expect(scope.post).toBe(false);
        expect(scope.reach).toBe(condition);
        expect(scope.query).toEqual(appendQueryConditions(query, or(ownership, condition)));
    });

    it('appends the bare reach without an ownership term', async () => {
        const condition = eq('realmId', 'r1');
        const evaluator = new RecordingEvaluator({ verdict: 'conditional', condition });
        const query = new Query({});

        expect((await scopeReadQuery(query, evaluator, { names: NAMES })).query)
            .toEqual(appendQueryConditions(query, condition));
    });

    it('narrows a deny to the ownership term, or to nothing', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'deny' });
        const query = new Query({});

        expect((await scopeReadQuery(query, evaluator, { names: NAMES, ownership })).query)
            .toEqual(appendQueryConditions(query, ownership));
        expect((await scopeReadQuery(query, evaluator, { names: NAMES })).query)
            .toEqual(appendQueryConditions(query, inArray('id', [])));
    });

    it('hands a post verdict back unlowered', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'post' });
        const query = new Query({});

        expect(await scopeReadQuery(query, evaluator, { names: NAMES, ownership })).toEqual({
            query,
            post: true,
            ownership,
        });
    });

    it('widens a post verdict with the realm column and the retained columns', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'post' });
        const query = new Query({});
        const calls: string[][] = [];
        const widen = (input: IQuery, retain: string[]) => {
            calls.push(retain);

            return new Query({ fields: new Fields([new Field('name')]), filters: input.filters });
        };

        const scope = await scopeReadQuery(query, evaluator, {
            names: NAMES,
            widen,
            retain: ['id'],
            realmAttributeName: 'userRealmId',
        });

        expect(scope.post).toBe(true);
        expect(scope.query).not.toBe(query);
        expect(calls).toEqual([['userRealmId', 'id']]);

        await scopeReadQuery(query, evaluator, { names: NAMES, widen });
        await scopeReadQuery(query, evaluator, {
            names: NAMES, 
            widen, 
            realm: 'r1', 
        });

        expect(calls.slice(1)).toEqual([['realmId'], []]);
    });

    it('rethrows a failed pre-gate', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'allow' }, false);

        await expect(scopeReadQuery(new Query({}), evaluator, { names: NAMES, ownership })).rejects.toBeDefined();
        expect(evaluator.compileCalls).toHaveLength(0);
    });

    it('narrows a failed pre-gate to the ownership term in self-service mode', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'allow' }, false);
        const query = new Query({});

        expect(await scopeReadQuery(query, evaluator, {
            names: NAMES,
            ownership,
            selfService: true,
        })).toEqual({
            query: appendQueryConditions(query, ownership),
            post: false,
            ownership,
        });
        expect(evaluator.compileCalls).toHaveLength(0);
    });

    it('rethrows a failed pre-gate in self-service mode without an ownership term', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'allow' }, false);

        await expect(scopeReadQuery(new Query({}), evaluator, { names: NAMES, selfService: true }))
            .rejects.toBeDefined();
    });

    it('skips the compile when the list only pre-gates', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'deny' });
        const query = new Query({});

        expect(await scopeReadQuery(query, evaluator, { names: NAMES, compile: false })).toEqual({
            query,
            post: false,
            ownership: null,
        });
        expect(evaluator.compileCalls).toHaveLength(0);
    });

    it('passes the realm column and a fixed realm on to the compile', async () => {
        const evaluator = new RecordingEvaluator({ verdict: 'allow' });

        await scopeReadQuery(new Query({}), evaluator, { names: NAMES, realmAttributeName: 'userRealmId' });
        await scopeReadQuery(new Query({}), evaluator, { names: NAMES, realm: false });
        await scopeReadQuery(new Query({}), evaluator, { names: NAMES });

        expect(evaluator.compileCalls[0]!.realmAttributeName).toEqual('userRealmId');
        expect(evaluator.compileCalls[1]!.realm).toBe(false);
        expect('realm' in evaluator.compileCalls[2]!).toBe(false);
    });

    it('scopes a realm-less resource by its policies alone', async () => {
        const evaluator = await createAuthorizationEvaluator({
            catalog: {
                policies: {
                    binding: { type: 'permissionBinding' },
                    published: { type: 'attributes', query: { published: { $eq: true } } },
                },
                permissions: [{
                    name: 'post_read',
                    realmId: null,
                    clientId: null,
                    decisionStrategy: null,
                    policies: ['binding'],
                }],
            },
            grants: [{
                name: 'post_read',
                realm_id: null,
                client_id: null,
                realm_scope: 'own',
                policies: ['published'],
            }],
            identity: {
                id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                type: 'user',
                realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                realmName: 'master',
                clientId: null,
            },
        });

        const query = new Query({});
        const scope = await scopeReadQuery(query, evaluator, { names: ['post_read'], realm: false });

        expect(scope.post).toBe(false);
        expect(collect(scope.query.filters)).toEqual([['published', true]]);
    });
});

describe('narrowReadScope', () => {
    it('returns a lowered scope unchanged', () => {
        const query = new Query({});

        expect(narrowReadScope({
            query, 
            post: false, 
            ownership: null, 
        })).toBe(query);
    });

    it('narrows a post scope to its ownership term, or to nothing', () => {
        const query = new Query({});
        const owner = and(eq('sub', 'u1'), eq('subKind', 'user'));

        expect(narrowReadScope({
            query, 
            post: true, 
            ownership: owner, 
        }))
            .toEqual(appendQueryConditions(query, owner));
        expect(narrowReadScope({
            query, 
            post: true, 
            ownership: null, 
        }))
            .toEqual(appendQueryConditions(query, inArray('id', [])));
    });
});
