/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SystemPolicyName } from '@authup/access';
import { EntityType, PermissionName, ScopeName } from '@authup/core-kit';
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
            translate(EntityType.PERMISSION, PermissionName.CLIENT_CREATE),
            translate(EntityType.POLICY, SystemPolicyName.DEFAULT),
            translate(EntityType.SCOPE, ScopeName.OPEN_ID),
            translate(EntityType.PERMISSION, 'reports_export'),
            translate(EntityType.USER, 'admin'),
        ].map((text) => h('li', text)).concat(h('button', { onClick: () => { locale.value = 'de'; } })));
    },
});

describe('useEntityNameTranslator', () => {
    it('answers the catalog name, a dotted policy name included, and the raw name for everything else', async () => {
        const { wrapper } = mountKitComponent(component);

        expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
            'Create clients',
            'Default policy',
            'OpenID sign-in',
            'reports_export',
            'admin',
        ]);

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.findAll('li')[0].text()).toEqual('Clients erstellen');
    });
});
