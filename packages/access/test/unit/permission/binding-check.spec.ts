/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { DecisionStrategy } from '@authup/kit';
import { RealmScope, isPermissionPolicyBinding } from '../../../src';

type Case = [string, unknown];

describe('src/permission/helpers/check', () => {
    it.each<Case>([
        ['a minimal binding', { permission: { name: 'x' } }],
        ['null optional permission members', {
            permission: {
                name: 'x',
                realmId: null,
                clientId: null,
                decisionStrategy: null,
            },
        }],
        ['string realm and client ids', {
            permission: {
                name: 'x',
                realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                clientId: '245e3c5d-5747-4fbd-8554-c33d34780c58',
            },
        }],
        ['an empty policy list', { permission: { name: 'x' }, policies: [] }],
        ['a policy with an unknown type and any configuration', {
            permission: { name: 'x' },
            policies: [{ type: 'custom', anything: { nested: [1, 2] } }],
        }],
        ...Object.values(RealmScope).map((realmScope) : Case => [
            `realmScope ${realmScope}`,
            { permission: { name: 'x' }, realmScope },
        ]),
        ...Object.values(DecisionStrategy).map((decisionStrategy) : Case => [
            `decisionStrategy ${decisionStrategy}`,
            { permission: { name: 'x', decisionStrategy } },
        ]),
    ])('accepts %s', (_name, value) => {
        expect(isPermissionPolicyBinding(value)).toBe(true);
    });

    it.each<Case>([
        ['undefined', undefined],
        ['null', null],
        ['a string', 'x'],
        ['an array', [{ permission: { name: 'x' } }]],
        ['a missing permission', { policies: [] }],
        ['a null permission', { permission: null }],
        ['a permission that is a string', { permission: 'x' }],
        ['a missing permission name', { permission: {} }],
        ['an empty permission name', { permission: { name: '' } }],
        ['a permission name that is a number', { permission: { name: 1 } }],
        ['a realmId that is a number', { permission: { name: 'x', realmId: 1 } }],
        ['a clientId that is a number', { permission: { name: 'x', clientId: 1 } }],
        ['an unknown decisionStrategy', { permission: { name: 'x', decisionStrategy: 'majority' } }],
        ['policies that are not an array', { permission: { name: 'x' }, policies: { type: 'attributes' } }],
        ['null policies', { permission: { name: 'x' }, policies: null }],
        ['a policy without a type', { permission: { name: 'x' }, policies: [{ query: {} }] }],
        ['a policy with a type that is not a string', { permission: { name: 'x' }, policies: [{ type: 1 }] }],
        ['a policy that is null', { permission: { name: 'x' }, policies: [null] }],
        ['a policy that is a string', { permission: { name: 'x' }, policies: ['attributes'] }],
        ['an unknown realmScope', { permission: { name: 'x' }, realmScope: 'all' }],
        ['a null realmScope', { permission: { name: 'x' }, realmScope: null }],
    ])('refuses %s', (_name, value) => {
        expect(isPermissionPolicyBinding(value)).toBe(false);
    });
});
