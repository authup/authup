/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { IdentityType, PermissionName } from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { Query, Relation, Relations } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { redactUnreachedRelations } from '../../../../src/core/query/include.ts';
import { sessionSchema } from '../../../../src/core/entities/session/schema.ts';
import { userRoleSchema } from '../../../../src/core/entities/user-role/schema.ts';

function include(...names: string[]) {
    return new Query({ relations: new Relations(names.map((name) => new Relation(name))) });
}

function reachOnly(realmIds: (string | null)[]) {
    return new FakePermissionEvaluator(({ method, ctx }) => {
        if (method !== 'evaluateOneOf') {
            return;
        }

        const realm = ctx.data?.get(BuiltInPolicyType.REALM_MATCH);

        if (!realmIds.includes(realm as string | null)) {
            throw PermissionError.denied('test');
        }
    });
}

describe('core/query/include', () => {
    it('should strip a joined row outside the target reach and keep the parent', async () => {
        const evaluator = reachOnly(['r1', null]);
        const actor: ActorContext = { permissionEvaluator: evaluator };

        const rows = [
            {
                id: 'a', 
                roleId: 'own', 
                role: { id: 'own', realmId: 'r1' }, 
            },
            {
                id: 'b', 
                roleId: 'foreign', 
                role: { id: 'foreign', realmId: 'r2' }, 
            },
            {
                id: 'c', 
                roleId: 'global', 
                role: { id: 'global', realmId: null }, 
            },
        ];

        const output = await redactUnreachedRelations(rows, include('role'), userRoleSchema, actor);

        expect(output).toHaveLength(3);
        expect(output[0].role).toBeDefined();
        expect(output[1].role).toBeUndefined();
        expect(output[1].roleId).toEqual('foreign');
        expect(output[2].role).toBeDefined();

        expect(evaluator.compileCalls).toHaveLength(1);
        expect(evaluator.compileCalls[0].name).toEqual([
            PermissionName.ROLE_READ,
            PermissionName.ROLE_UPDATE,
            PermissionName.ROLE_DELETE,
        ]);
    });

    it('should evaluate a joined row shared by several parents once', async () => {
        const evaluator = reachOnly(['r1']);
        const actor: ActorContext = { permissionEvaluator: evaluator };

        const rows = [
            { id: 'a', role: { id: 'shared', realmId: 'r1' } },
            { id: 'b', role: { id: 'shared', realmId: 'r1' } },
        ];

        await redactUnreachedRelations(rows, include('role'), userRoleSchema, actor);

        expect(evaluator.evaluateOneOfCalls).toHaveLength(1);
    });

    it('should keep every joined row on an unbounded reach without evaluating rows', async () => {
        const evaluator = reachOnly([]);

        evaluator.setCompileResult({ verdict: 'allow' });

        const rows = [{ id: 'a', role: { id: 'foreign', realmId: 'r2' } }];

        await redactUnreachedRelations(rows, include('role'), userRoleSchema, { permissionEvaluator: evaluator });

        expect(rows[0].role).toBeDefined();
        expect(evaluator.evaluateOneOfCalls).toHaveLength(0);
    });

    it('should strip a joined row whose realm was not projected', async () => {
        const evaluator = reachOnly([null]);

        const rows: Record<string, any>[] = [{ id: 'a', role: { id: 'r', name: 'x' } }];

        await redactUnreachedRelations(rows, include('role'), userRoleSchema, { permissionEvaluator: evaluator });

        expect(rows[0].role).toBeUndefined();
    });

    it('should keep the actor\'s own identity joined without a read grant', async () => {
        const evaluator = new FakePermissionEvaluator();

        evaluator.setCompileResult({ verdict: 'deny' });

        const actor: ActorContext = {
            permissionEvaluator: evaluator,
            identity: { type: IdentityType.CLIENT, data: { id: 'self', realmId: 'r1' } as Client },
        };

        const rows = [
            { id: 's1', client: { id: 'self', realmId: 'r1' } },
            { id: 's2', client: { id: 'other', realmId: 'r1' } },
        ];

        await redactUnreachedRelations(rows, include('client'), sessionSchema, actor);

        expect(rows[0].client).toBeDefined();
        expect(rows[1].client).toBeUndefined();
    });

    it('should leave an ungated target untouched', async () => {
        const evaluator = new FakePermissionEvaluator();

        evaluator.denyAll();

        const rows = [{ id: 's1', realm: { id: 'r2' } }];

        await redactUnreachedRelations(rows, include('realm'), sessionSchema, { permissionEvaluator: evaluator });

        expect(rows[0].realm).toBeDefined();
        expect(evaluator.compileCalls).toHaveLength(0);
    });
});
