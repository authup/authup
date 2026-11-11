/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { isFilter, isGroupedQuery, isParseError } from '@rapiq/core';
import type { ICondition } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { decodeQuery } from '../../../../src/core/query/module.ts';
import { sessionSchema } from '../../../../src/core/entities/session/schema.ts';
import { userRoleSchema } from '../../../../src/core/entities/user-role/schema.ts';

function fieldsOf(node: ICondition): string[] {
    if (isFilter(node)) {
        return [node.field];
    }

    return (node.value as ICondition[]).flatMap((child) => fieldsOf(child));
}

const input = {
    filter: { 'role.name': 'foo', roleId: '5b39b8fe-47e8-4ff3-829b-c8cbcc5f69b1' },
    sort: 'role.name',
};

function actorWith(verdict: 'allow' | 'deny' | 'conditional') {
    const evaluator = new FakePermissionEvaluator();

    evaluator.setCompileResult(verdict === 'conditional' ?
        { verdict, condition: {} } as any :
        { verdict });

    return { permissionEvaluator: evaluator } satisfies ActorContext;
}

describe('core/query/reach', () => {
    it('should keep dotted keys for a reader the target allows', async () => {
        const query = await decodeQuery(input, { schema: userRoleSchema, actor: actorWith('allow') });

        expect(fieldsOf(query.filters)).toContain('role.name');
        expect(query.sorts.value.map((sort) => sort.name)).toContain('role.name');
    });

    it('should prune dotted keys for a conditional reader and keep the rest', async () => {
        const query = await decodeQuery(input, { schema: userRoleSchema, actor: actorWith('conditional') });

        expect(fieldsOf(query.filters)).not.toContain('role.name');
        expect(fieldsOf(query.filters)).toContain('roleId');
        expect(query.sorts.value.map((sort) => sort.name)).not.toContain('role.name');
    });

    it('should refuse a destructive selection instead of pruning it', async () => {
        const error = await decodeQuery(input, {
            schema: userRoleSchema,
            actor: actorWith('conditional'),
            throwOnFailure: true,
        }).catch((e) => e);

        expect(isParseError(error)).toBe(true);
    });

    it('should leave a system decode untouched', async () => {
        const query = await decodeQuery(input, { schema: userRoleSchema });

        expect(fieldsOf(query.filters)).toContain('role.name');
    });
});

describe('core/query/reach on a grouped decode', () => {
    const parameters = ['filters', 'groups', 'aggregates'] as const;
    const grouped = {
        group: 'bucket(createdAt,day)',
        aggregate: 'count',
    };

    it('should decode no sort key for a grouped read, whatever the reader', async () => {
        for (const verdict of ['allow', 'conditional', 'deny'] as const) {
            const query = await decodeQuery({ ...grouped, sort: 'user.name' }, {
                schema: sessionSchema,
                parameters: [...parameters],
                actor: actorWith(verdict),
            });

            expect(isGroupedQuery(query)).toBe(true);
            expect(query.sorts.value).toEqual([]);
        }
    });

    it('should prune a dotted filter key of a grouped read for a conditional reader', async () => {
        const input = { ...grouped, filter: { 'user.name': 'foo' } };

        const allowed = await decodeQuery(input, {
            schema: sessionSchema,
            parameters: [...parameters],
            actor: actorWith('allow'),
        });
        const conditional = await decodeQuery(input, {
            schema: sessionSchema,
            parameters: [...parameters],
            actor: actorWith('conditional'),
        });

        expect(fieldsOf(allowed.filters)).toContain('user.name');
        expect(fieldsOf(conditional.filters)).not.toContain('user.name');
    });

    it.each([
        ['a group key through a relation', { group: 'bucket(createdAt,day),user.name', aggregate: 'count' }],
        ['a group function over a relation column', { group: 'bucket(user.createdAt,day)', aggregate: 'count' }],
        ['a dotted group alias', { group: 'bucket(createdAt,day):user.name', aggregate: 'count' }],
        ['a dotted aggregate alias', { group: 'bucket(createdAt,day)', aggregate: 'count:user.name' }],
    ])('should refuse %s', async (_label, input) => {
        const error = await decodeQuery(input, {
            schema: sessionSchema,
            parameters: [...parameters],
            actor: actorWith('allow'),
        }).catch((e) => e);

        expect(isParseError(error)).toBe(true);
    });

    it('should not group a list decode, so its dotted sort key is pruned like any other', async () => {
        const input = { ...grouped, sort: 'user.name' };

        const allowed = await decodeQuery(input, { schema: sessionSchema, actor: actorWith('allow') });
        const conditional = await decodeQuery(input, { schema: sessionSchema, actor: actorWith('conditional') });

        expect(isGroupedQuery(allowed)).toBe(false);
        expect(allowed.sorts.value.map((sort) => sort.name)).toContain('user.name');
        expect(isGroupedQuery(conditional)).toBe(false);
        expect(conditional.sorts.value.map((sort) => sort.name)).not.toContain('user.name');
    });
});
