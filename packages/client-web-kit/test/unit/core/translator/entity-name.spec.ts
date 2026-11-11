/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SystemPolicyName } from '@authup/access';
import {
    EntityType,
    EventName,
    PermissionName,
    ScopeName,
} from '@authup/core-kit';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { injectTranslatorLocale, useEntityNameTranslator } from '../../../../src';
import { mountKitComponent } from '../../../utils';

const component = defineComponent({
    setup() {
        const locale = injectTranslatorLocale();
        const translate = useEntityNameTranslator();

        return () => h('ul', [
            translate(EntityType.PERMISSION, { name: PermissionName.CLIENT_CREATE, builtIn: true }),
            translate(EntityType.POLICY, { name: SystemPolicyName.DEFAULT, builtIn: true }),
            translate(EntityType.SCOPE, { name: ScopeName.OPEN_ID, builtIn: true }),
            translate(EntityType.PERMISSION, { name: 'reports_export' }),
            translate(EntityType.USER, { name: 'admin', builtIn: true }),
            translate(EntityType.PERMISSION, { name: PermissionName.CLIENT_CREATE, builtIn: false }),
            translate(EntityType.PERMISSION, {
                name: PermissionName.CLIENT_CREATE,
                displayName: 'Onboard apps',
                builtIn: true,
            }),
            translate(EntityType.EVENT, { name: EventName.LOGIN_FAILED }),
            translate(EntityType.EVENT, { name: 'somethingNew' }),
        ].map((text) => h('li', text)).concat(h('button', {
            onClick: () => {
                locale.value = 'de';
            },
        })));
    },
});

describe('useEntityNameTranslator', () => {
    it('prefers the display name, localizes built-in rows and known event names only, and answers the raw name otherwise', async () => {
        const { wrapper } = mountKitComponent(component);

        expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
            'Create clients',
            'Default policy',
            'OpenID sign-in',
            'reports_export',
            'admin',
            PermissionName.CLIENT_CREATE,
            'Onboard apps',
            'Failed sign-in',
            'somethingNew',
        ]);

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.findAll('li')[0].text()).toEqual('Clients erstellen');
    });
});
