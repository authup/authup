/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { isFilter, isParseError } from '@rapiq/core';
import type { ICondition } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { decodeQuery } from '../../../../src/core/query/module.ts';
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
