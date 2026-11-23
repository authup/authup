/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { Component } from 'vue';
import AClientForm from '../../../../src/components/entities/client/AClientForm.vue';
import APathForm from '../../../../src/components/entities/path/APathForm.vue';
import APolicyForm from '../../../../src/components/entities/policy/APolicyForm.vue';
import AUserForm from '../../../../src/components/entities/user/AUserForm.vue';
import APermissionForm from '../../../../src/components/entities/permission/APermissionForm.vue';
import ARealmForm from '../../../../src/components/entities/realm/ARealmForm.vue';
import ARoleForm from '../../../../src/components/entities/role/ARoleForm.vue';
import AScopeForm from '../../../../src/components/entities/scope/AScopeForm.vue';
import { AFormSubmit } from '../../../../src/components/utility/index.ts';
import { mountKitComponent } from '../../../utils/index.ts';

const ENTITY_ID = '9a5c1d3e-2b4f-4a6c-8d7e-1f2a3b4c5d6e';
const REALM_ID = '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11';

/**
 * A save that is still pending must not leave the fields editable: the
 * response re-initializes the form from the saved snapshot, so text typed in
 * the meantime would be overwritten without notice (#3863).
 */
describe.each<[string, Component, string, Record<string, unknown>?]>([
    ['ARoleForm', ARoleForm, 'roles'],
    ['AScopeForm', AScopeForm, 'scopes'],
    ['ARealmForm', ARealmForm, 'realms'],
    ['APermissionForm', APermissionForm, 'permissions'],
    ['AClientForm', AClientForm, 'clients'],
    ['AUserForm', AUserForm, 'users'],
    ['APathForm', APathForm, 'paths'],
    ['APolicyForm', APolicyForm, 'policies', { type: 'composite', decisionStrategy: 'unanimous' }],
])('%s', (_name, component, collection, extra = {}) => {
    it('should disable its fields while a save is pending', async () => {
        const entity = {
            id: ENTITY_ID,
            name: 'alpha',
            displayName: 'Alpha',
            description: '',
            realmId: REALM_ID,
            updatedAt: '2026-01-01T00:00:00.000Z',
            ...extra,
        };

        const deferred = Promise.withResolvers<void>();

        const { wrapper } = mountKitComponent(component, { entity }, {
            [`POST /${collection}/:id`]: async () => {
                await deferred.promise;

                return {
                    data: { ...entity, updatedAt: '2026-01-02T00:00:00.000Z' },
                    meta: {},
                };
            },
            '*': () => ({
                data: [],
                meta: {
                    total: 0,
                    limit: 10,
                    offset: 0,
                },
            }),
        });

        await flushPromises();

        const fieldset = () => wrapper.find('fieldset');

        expect(fieldset().exists()).toBe(true);
        expect(fieldset().attributes('disabled')).toBeUndefined();

        wrapper.findComponent(AFormSubmit).vm.$emit('submit');
        await flushPromises();

        expect(fieldset().attributes('disabled')).toBeDefined();

        deferred.resolve();
        await flushPromises();

        expect(fieldset().attributes('disabled')).toBeUndefined();

        wrapper.unmount();
    });
});
