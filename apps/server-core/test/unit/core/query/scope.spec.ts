/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityType, PermissionName } from '@authup/core-kit';
import type { User } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import {
    Query,
    and,
    eq,
    inArray,
    or,
} from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { appendQueryConditions } from '../../../../src/core/query/module.ts';
import { narrowReadScope, scopeReadQuery } from '../../../../src/core/query/scope.ts';

const NAMES = [PermissionName.USER_READ, PermissionName.USER_UPDATE];

function makeActor(options: { allow?: boolean, identity?: boolean } = {}): ActorContext {
    const evaluator = new FakePermissionEvaluator();
    if (options.allow === false) {
        evaluator.denyAll();
    }

    const actor: ActorContext = { permissionEvaluator: evaluator };
    if (options.identity !== false) {
        actor.identity = {
            type: IdentityType.USER,
            data: { id: 'u1', realmId: 'r1' } as User,
        };
    }

    return actor;
}

function evaluatorOf(actor: ActorContext) {
    return actor.permissionEvaluator as FakePermissionEvaluator;
}

const ownership = eq('id', 'u1');

describe('scopeReadQuery', () => {
    it('passes the query through on allow', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });
        const query = new Query({});

        const scope = await scopeReadQuery(query, actor, { names: NAMES, ownership });

        expect(scope).toEqual({
            query, 
            post: false, 
            ownership, 
        });
        expect(evaluatorOf(actor).preEvaluateOneOfCalls.map((call) => call.name)).toEqual([NAMES]);
        expect(evaluatorOf(actor).compileCalls.map((call) => call.name)).toEqual([NAMES]);
    });

    it('ORs the ownership term into a conditional reach', async () => {
        const actor = makeActor();
        const condition = eq('realmId', 'r1');
        evaluatorOf(actor).setCompileResult({ verdict: 'conditional', condition });
        const query = new Query({});

        const scope = await scopeReadQuery(query, actor, { names: NAMES, ownership });

        expect(scope.post).toBe(false);
        expect(scope.query).toEqual(appendQueryConditions(query, or(ownership, condition)));
    });

    it('appends the bare reach without an ownership term', async () => {
        const actor = makeActor();
        const condition = eq('realmId', 'r1');
        evaluatorOf(actor).setCompileResult({ verdict: 'conditional', condition });
        const query = new Query({});

        const scope = await scopeReadQuery(query, actor, { names: NAMES });

        expect(scope.query).toEqual(appendQueryConditions(query, condition));
    });

    it('narrows a deny to the ownership term, or to nothing', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'deny' });
        const query = new Query({});

        expect((await scopeReadQuery(query, actor, { names: NAMES, ownership })).query)
            .toEqual(appendQueryConditions(query, ownership));
        expect((await scopeReadQuery(query, actor, { names: NAMES })).query)
            .toEqual(appendQueryConditions(query, inArray('id', [])));
    });

    it('hands a post verdict back unlowered', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'post' });
        const query = new Query({});

        const scope = await scopeReadQuery(query, actor, { names: NAMES, ownership });

        expect(scope).toEqual({
            query, 
            post: true, 
            ownership, 
        });
    });

    it('rethrows a failed pre-gate', async () => {
        const actor = makeActor({ allow: false });

        await expect(scopeReadQuery(new Query({}), actor, { names: NAMES, ownership }))
            .rejects.toBeDefined();
        expect(evaluatorOf(actor).compileCalls).toHaveLength(0);
    });

    it('narrows a failed pre-gate to the ownership term in self-service mode', async () => {
        const actor = makeActor({ allow: false });
        const query = new Query({});

        const scope = await scopeReadQuery(query, actor, {
            names: NAMES, 
            ownership, 
            selfService: true, 
        });

        expect(scope).toEqual({
            query: appendQueryConditions(query, ownership), 
            post: false, 
            ownership, 
        });
        expect(evaluatorOf(actor).compileCalls).toHaveLength(0);
    });

    it('rethrows a failed pre-gate in self-service mode without an ownership term', async () => {
        const actor = makeActor({ allow: false, identity: false });

        await expect(scopeReadQuery(new Query({}), actor, { names: NAMES, selfService: true }))
            .rejects.toBeDefined();
    });

    it('skips the compile when the list only pre-gates', async () => {
        const actor = makeActor();
        const query = new Query({});

        const scope = await scopeReadQuery(query, actor, { names: NAMES, compile: false });

        expect(scope).toEqual({
            query, 
            post: false, 
            ownership: null, 
        });
        expect(evaluatorOf(actor).compileCalls).toHaveLength(0);
    });

    it('passes the realm column on to the compile', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        await scopeReadQuery(new Query({}), actor, { names: NAMES, realmAttributeName: 'userRealmId' });

        expect(evaluatorOf(actor).compileCalls[0].realmAttributeName).toEqual('userRealmId');
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
