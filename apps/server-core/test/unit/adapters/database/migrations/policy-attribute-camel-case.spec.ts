/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { camelCase } from 'change-case';
import { describe, expect, it } from 'vitest';
import {
    POLICY_ATTRIBUTE_KEY_RENAMES,
    PROPERTY_RENAMES,
    camelizePropertyPath,
    snakizePropertyPath,
    transformAttributeNameValue,
    transformNamesValue,
    transformQueryValue,
} from '../../../../../src/adapters/database/migrations/helpers/policy-attribute-camel-case.ts';

describe('src/adapters/database/migrations/helpers/policy-attribute-camel-case', () => {
    describe('property paths', () => {
        it('camelizes vocabulary segments per dot segment (no path collapse)', () => {
            expect(camelizePropertyPath('realm_id')).toEqual('realmId');
            expect(camelizePropertyPath('user.realm_id')).toEqual('user.realmId');
            expect(camelizePropertyPath('client_id.realm_id')).toEqual('clientId.realmId');
        });

        it('leaves non-vocabulary segments untouched (idempotent)', () => {
            expect(camelizePropertyPath('name')).toEqual('name');
            expect(camelizePropertyPath('realmId')).toEqual('realmId');
            expect(camelizePropertyPath('REALM')).toEqual('REALM');
            expect(camelizePropertyPath(camelizePropertyPath('realm_id'))).toEqual('realmId');
        });

        it('never touches live snake-case ATTRIBUTE-key references (outside the vocabulary)', () => {
            // role-attribute keys were never renamed by plan 073, and snake
            // user-attribute keys are legal post-073 — a policy referencing
            // them is a WORKING reference the migration must not break.
            expect(camelizePropertyPath('cost_center')).toEqual('cost_center');
            expect(camelizePropertyPath('my_custom_flag')).toEqual('my_custom_flag');
            expect(snakizePropertyPath('costCenter')).toEqual('costCenter');
        });

        it('snakizes vocabulary segments per dot segment', () => {
            expect(snakizePropertyPath('realmId')).toEqual('realm_id');
            expect(snakizePropertyPath('user.realmId')).toEqual('user.realm_id');
            expect(snakizePropertyPath('name')).toEqual('name');
        });
    });

    describe('vocabularies', () => {
        it('maps each policy EA key onto its camel validator mount', () => {
            for (const [from, to] of POLICY_ATTRIBUTE_KEY_RENAMES) {
                expect(to).toEqual(camelCase(from));
            }
        });

        it('keeps the property-rename vocabulary bijective and camel-consistent', () => {
            const snakes = new Set<string>();
            const camels = new Set<string>();
            for (const [from, to] of PROPERTY_RENAMES) {
                expect(to).toEqual(camelCase(from));
                snakes.add(from);
                camels.add(to);
            }
            expect(snakes.size).toEqual(PROPERTY_RENAMES.length);
            expect(camels.size).toEqual(PROPERTY_RENAMES.length);
        });
    });

    describe('transformQueryValue', () => {
        it('rewrites field keys, never operator keys or values', () => {
            const input = JSON.stringify({
                realm_id: { $in: ['my_service', 'other_value'] },
                $or: [
                    { 'user.realm_id': 'abc' },
                    { client_id: { $ne: null } },
                ],
                name: { $regex: '/foo_bar/i' },
            });

            expect(JSON.parse(transformQueryValue(input, camelizePropertyPath)!)).toEqual({
                realmId: { $in: ['my_service', 'other_value'] },
                $or: [
                    { 'user.realmId': 'abc' },
                    { clientId: { $ne: null } },
                ],
                name: { $regex: '/foo_bar/i' },
            });
        });

        it('recurses into $elemMatch / $not sub-documents', () => {
            const input = JSON.stringify({ items: { $elemMatch: { realm_id: 'abc', $not: { status_message: 'x' } } } });

            expect(JSON.parse(transformQueryValue(input, camelizePropertyPath)!)).toEqual({ items: { $elemMatch: { realmId: 'abc', $not: { statusMessage: 'x' } } } });
        });

        it('returns null for unchanged, non-object, or unparseable values', () => {
            expect(transformQueryValue(JSON.stringify({ realmId: 'abc' }), camelizePropertyPath)).toBeNull();
            expect(transformQueryValue('not-json', camelizePropertyPath)).toBeNull();
            expect(transformQueryValue('"scalar"', camelizePropertyPath)).toBeNull();
            expect(transformQueryValue('[1,2]', camelizePropertyPath)).toBeNull();
        });

        it('round-trips through the snake transform', () => {
            const camel = JSON.stringify({ realmId: { $in: ['a'] }, 'user.realmId': 'x' });
            const snake = transformQueryValue(camel, snakizePropertyPath)!;

            expect(JSON.parse(snake)).toEqual({ realm_id: { $in: ['a'] }, 'user.realm_id': 'x' });
            expect(JSON.parse(transformQueryValue(snake, camelizePropertyPath)!)).toEqual(JSON.parse(camel));
        });
    });

    describe('transformNamesValue', () => {
        it('rewrites array entries (they ARE property names), keeping non-vocabulary keys', () => {
            const input = JSON.stringify(['name_locked', 'status_message', 'realmId', 'cost_center']);

            expect(JSON.parse(transformNamesValue(input, camelizePropertyPath)!))
                .toEqual(['nameLocked', 'statusMessage', 'realmId', 'cost_center']);
        });

        it('returns null for unchanged or non-array values', () => {
            expect(transformNamesValue(JSON.stringify(['nameLocked']), camelizePropertyPath)).toBeNull();
            expect(transformNamesValue('{"a":1}', camelizePropertyPath)).toBeNull();
            expect(transformNamesValue('not-json', camelizePropertyPath)).toBeNull();
        });
    });

    describe('transformAttributeNameValue', () => {
        it('rewrites the raw scalar form (scalars serialize unquoted)', () => {
            expect(transformAttributeNameValue('realm_id', camelizePropertyPath)).toEqual('realmId');
            expect(transformAttributeNameValue('realmId', camelizePropertyPath)).toBeNull();
        });

        it('rewrites the array form', () => {
            expect(JSON.parse(transformAttributeNameValue(JSON.stringify(['realm_id', 'realm_name']), camelizePropertyPath)!))
                .toEqual(['realmId', 'realmName']);
        });
    });
});
