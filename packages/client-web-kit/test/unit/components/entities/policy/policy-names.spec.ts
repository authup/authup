/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, SystemPolicyName } from '@authup/access';
import type { Policy } from '@authup/core-kit';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { APermissionPolicyBindingButton } from '../../../../../src/components/entities/permission-policy-binding';
import APermissionPolicyAssignments from '../../../../../src/components/entities/permission-policy/APermissionPolicyAssignments.vue';
import APolicySummary from '../../../../../src/components/entities/policy/APolicySummary.vue';
import { mountKitComponent } from '../../../../utils';

const now = new Date(0).toISOString();

function buildPolicy(input: Partial<Policy>) : Policy {
    return {
        id: 'policy-1',
        builtIn: false,
        type: BuiltInPolicyType.COMPOSITE,
        name: 'reports',
        displayName: null,
        description: null,
        invert: false,
        children: [],
        parentId: null,
        parent: null,
        realmId: null,
        realm: null,
        createdAt: now,
        updatedAt: now,
        ...input,
    };
}

function rowValue(wrapper: ReturnType<typeof mountKitComponent>['wrapper'], label: string) : string | undefined {
    const row = wrapper.findAll('.flex-row')
        .find((item) => item.find('strong').text() === label);

    return row ? row.findAll('div')[0].text() : undefined;
}

describe('APolicySummary', () => {
    it('keeps the raw name and shows the localized label of a built-in policy as its display name', () => {
        const { wrapper } = mountKitComponent(APolicySummary, {
            entity: buildPolicy({
                name: SystemPolicyName.DEFAULT,
                builtIn: true,
            }),
        });

        expect(rowValue(wrapper, 'Name')).toEqual(SystemPolicyName.DEFAULT);
        expect(rowValue(wrapper, 'Display name')).toEqual('Default policy');
    });

    it('shows no display name row for a custom policy named like a built-in one', () => {
        const { wrapper } = mountKitComponent(APolicySummary, { entity: buildPolicy({ name: SystemPolicyName.DEFAULT }) });

        expect(rowValue(wrapper, 'Name')).toEqual(SystemPolicyName.DEFAULT);
        expect(rowValue(wrapper, 'Display name')).toBeUndefined();
    });

    it('prefers the display name over the catalog label', () => {
        const { wrapper } = mountKitComponent(APolicySummary, {
            entity: buildPolicy({
                name: SystemPolicyName.DEFAULT,
                builtIn: true,
                displayName: 'Baseline',
            }),
        });

        expect(rowValue(wrapper, 'Display name')).toEqual('Baseline');
    });
});

describe('APermissionPolicyAssignments', () => {
    it('renders the label over the raw name for a built-in policy, the display name or raw name otherwise', async () => {
        const policies = [
            buildPolicy({
                id: '1',
                name: SystemPolicyName.DEFAULT,
                builtIn: true,
            }),
            buildPolicy({ id: '2', name: 'reports' }),
            buildPolicy({
                id: '3',
                name: 'audit',
                displayName: 'Audit window',
            }),
        ];

        const { wrapper } = mountKitComponent(APermissionPolicyAssignments, { entityId: 'permission-1' }, {
            'GET /policies': () => ({
                data: policies,
                meta: {
                    total: policies.length,
                    limit: 10,
                    offset: 0,
                },
            }),
            'GET /permission-policies': () => ({
                data: [],
                meta: {
                    total: 0,
                    limit: 10,
                    offset: 0,
                },
            }),
        });

        await flushPromises();

        const items = wrapper.findAll('li');

        expect(items).toHaveLength(3);
        expect(items[0].find('div').text()).toEqual(`Default policy ${SystemPolicyName.DEFAULT}`);
        expect(items[0].find('small').text()).toEqual(SystemPolicyName.DEFAULT);
        expect(items[1].find('div').text()).toEqual('reports');
        expect(items[1].find('div').find('small').exists()).toBe(false);
        expect(items[2].find('div').text()).toEqual('Audit window audit');
    });
});

describe('APermissionPolicyBindingButton', () => {
    it('lists a built-in policy under its localized label with the raw name beside it', async () => {
        const policies = [
            buildPolicy({
                id: '1',
                name: SystemPolicyName.DEFAULT,
                builtIn: true,
            }),
            buildPolicy({ id: '2', name: 'reports' }),
        ];

        const { wrapper } = mountKitComponent(APermissionPolicyBindingButton, {
            entityType: 'clientPermission',
            entity: { clientId: 'client-1', permissionId: 'permission-1' },
        }, {
            'GET /policies': () => ({
                data: policies,
                meta: {
                    total: policies.length,
                    limit: 10,
                    offset: 0,
                },
            }),
        });

        await wrapper.find('button').trigger('click');
        await flushPromises();

        const items = Array.from(document.body.querySelectorAll('li'))
            .map((item) => item.querySelector('div'));

        expect(items).toHaveLength(2);
        expect(items[0]?.querySelector('small')?.textContent).toEqual(SystemPolicyName.DEFAULT);
        expect(items[0]?.textContent).toEqual(`Default policy${SystemPolicyName.DEFAULT}`);
        expect(items[1]?.textContent).toEqual('reports');

        wrapper.unmount();
    });
});
