/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Aggregate,
    Aggregates,
    Field,
    Fields,
    Group,
    Groups,
    Query,
    isGroupedQuery,
} from '@rapiq/core';
import type { IQuery } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { clientSchema } from '../../../../src/core/entities/client/schema.ts';
import { roleSchema } from '../../../../src/core/entities/role/schema.ts';
import { userSchema } from '../../../../src/core/entities/user/schema.ts';
import { decodeQuery, schemaRegistry } from '../../../../src/core/query/index.ts';
import {
    ReachCheckField,
    readDefaultFieldNames,
    readResponseAttributeNames,
    trimReachCheckFields,
    widenSparseRootProjection,
} from '../../../../src/core/query/projection.ts';

function readFieldNames(query: IQuery): string[] {
    return query.fields.value.map((field) => field.name);
}

function readAddedNames(query: IQuery): string[] {
    return query.fields.value
        .filter((field) => field instanceof ReachCheckField)
        .map((field) => field.name);
}

describe('core/query/projection', () => {
    describe('readDefaultFieldNames', () => {
        // a schema enumerating no column would skip the widening unnoticed
        it.each(schemaRegistry.getAll().map((schema) => [schema.name, schema] as const))(
            'should enumerate the columns of the %s schema',
            (_name, schema) => {
                const names = readDefaultFieldNames(schema);

                expect(names).toBeDefined();
                expect(names!.length).toBeGreaterThan(0);
            },
        );
    });

    describe('widenSparseRootProjection', () => {
        it('should load every default column the projection left out', async () => {
            const parsed = await decodeQuery({ fields: 'id' }, { schema: roleSchema });
            const widened = widenSparseRootProjection(parsed, roleSchema);

            expect(widened).not.toBe(parsed);
            expect([...readFieldNames(widened)].sort()).toEqual([...readDefaultFieldNames(roleSchema)!].sort());

            const added = readAddedNames(widened);

            expect(added).not.toContain('id');
            expect([...added].sort()).toEqual(
                readDefaultFieldNames(roleSchema)!.filter((name) => name !== 'id').sort(),
            );

            const requested = widened.fields.value.find((field) => field.name === 'id');

            expect(requested).toBeInstanceOf(Field);
            expect(requested).not.toBeInstanceOf(ReachCheckField);
        });

        it('should leave the input query untouched', async () => {
            const parsed = await decodeQuery({ fields: 'id' }, { schema: roleSchema });

            widenSparseRootProjection(parsed, roleSchema);

            expect(readFieldNames(parsed)).toEqual(['id']);
        });

        it('should return a query without a projection as is', async () => {
            const parsed = await decodeQuery({}, { schema: userSchema });

            expect(widenSparseRootProjection(parsed, userSchema)).toBe(parsed);
        });

        it('should return a projection naming every default column as is', async () => {
            const parsed = await decodeQuery(
                { fields: readDefaultFieldNames(roleSchema)!.join(',') },
                { schema: roleSchema },
            );

            expect(widenSparseRootProjection(parsed, roleSchema)).toBe(parsed);
        });

        it('should return a grouped query as is', () => {
            const grouped = new Query({
                fields: new Fields([new Field('id')]),
                groups: new Groups([new Group({
                    name: 'bucket',
                    params: ['createdAt', 'day'],
                    lowering: {
                        fn: 'bucket',
                        field: 'createdAt',
                        args: ['day'],
                    },
                })]),
                aggregates: new Aggregates([new Aggregate({
                    name: 'count',
                    lowering: {
                        fn: 'count',
                        field: undefined,
                        args: [],
                    },
                })]),
            });

            expect(isGroupedQuery(grouped)).toBe(true);
            expect(widenSparseRootProjection(grouped, roleSchema)).toBe(grouped);
        });

        it('should never add a column the schema does not default', async () => {
            const parsed = await decodeQuery({ fields: 'id' }, { schema: clientSchema });
            const widened = widenSparseRootProjection(parsed, clientSchema);
            const names = readFieldNames(widened);

            expect(names).toContain('name');
            expect(names).toContain('realmId');
            expect(names).not.toContain('secret');

            const user = widenSparseRootProjection(
                await decodeQuery({ fields: 'id' }, { schema: userSchema }),
                userSchema,
            );

            expect(readFieldNames(user)).not.toContain('email');
        });

        it('should only add root columns', async () => {
            const parsed = await decodeQuery({ fields: 'id', include: 'realm' }, { schema: roleSchema });
            const widened = widenSparseRootProjection(parsed, roleSchema);

            expect(readAddedNames(widened).every((name) => !name.includes('.'))).toBe(true);
        });

        it('should add a retained column as a response column', async () => {
            const parsed = await decodeQuery({ fields: 'id' }, { schema: roleSchema });
            const widened = widenSparseRootProjection(parsed, roleSchema, ['realmId']);

            expect(readFieldNames(widened)).toContain('realmId');
            expect(readAddedNames(widened)).not.toContain('realmId');
            expect(readAddedNames(widened)).toContain('name');
        });
    });

    describe('readResponseAttributeNames', () => {
        it('should answer the keys the response keeps', async () => {
            const parsed = await decodeQuery({ fields: 'id' }, { schema: roleSchema });
            const widened = widenSparseRootProjection(parsed, roleSchema);
            const row = { id: 1, name: 'a' };

            expect(readResponseAttributeNames(row, widened)).toEqual(['id']);
            expect(row).toEqual({ id: 1, name: 'a' });
        });

        it('should keep a column the query did not add', async () => {
            const parsed = await decodeQuery({ fields: 'id' }, { schema: roleSchema });
            const widened = widenSparseRootProjection(parsed, roleSchema, ['realmId']);

            expect(readResponseAttributeNames({
                id: 1,
                name: 'a',
                realmId: null,
            }, widened)).toEqual(['id', 'realmId']);
        });

        it('should answer every flattened key of an unprojected row', async () => {
            const parsed = await decodeQuery({}, { schema: roleSchema });

            expect(readResponseAttributeNames({
                id: 1,
                name: 'a',
                realm: { id: 2, name: 'b' },
            }, parsed)).toEqual(['id', 'name', 'realm.id', 'realm.name']);
        });
    });

    describe('trimReachCheckFields', () => {
        it('should remove the root columns the widening added', async () => {
            const parsed = await decodeQuery({ fields: 'id' }, { schema: roleSchema });
            const widened = widenSparseRootProjection(parsed, roleSchema);
            const rows = [
                {
                    id: 1,
                    name: 'a',
                    realmId: null,
                },
                {
                    id: 2,
                    name: 'b',
                    realmId: 'x',
                },
            ];

            trimReachCheckFields(rows, widened);

            expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
        });
    });
});
