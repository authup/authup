/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import type { App } from 'vue';
import { nextTick } from 'vue';
import AAccountShell from '../../../../src/components/utility/AAccountShell.vue';
import type { AAccountShellNavItem } from '../../../../src/components/utility/types';
import { injectStore } from '../../../../src/core';
import { mountKitComponent } from '../../../utils';

const items : AAccountShellNavItem[] = [
    {
        key: 'overview',
        label: 'Overview',
        link: { href: '/account' },
        active: true,
    },
    {
        key: 'sessions',
        label: 'Sessions',
        link: { href: '/account/sessions' },
    },
];

describe('AAccountShell', () => {
    it('should render nav items with active marker', () => {
        const { wrapper } = mountKitComponent(AAccountShell, { items });

        const links = wrapper.findAll('.a-account-shell-nav-link');
        expect(links).toHaveLength(2);
        expect(links[0].text()).toContain('Overview');
        expect(links[0].classes()).toContain('a-account-shell-nav-link--active');
        expect(links[1].classes()).not.toContain('a-account-shell-nav-link--active');
    });

    it('should emit signOut', async () => {
        const { wrapper } = mountKitComponent(AAccountShell, { items });

        await wrapper.find('.a-account-shell-user button').trigger('click');

        expect(wrapper.emitted('signOut')).toHaveLength(1);
    });

    it('should render the user chip from the store', async () => {
        const { wrapper, pinia } = mountKitComponent(AAccountShell, { items });

        expect(wrapper.find('.a-account-shell-user-chip').exists()).toBeFalsy();

        const store = injectStore(pinia, wrapper.vm.$.appContext.app as App);
        store.setUser({
            id: 'c0a1f9d1-53a4-44a8-b3f9-4e9d9a1c2b3d',
            name: 'peter',
            displayName: 'Peter',
        } as User);
        await nextTick();

        expect(wrapper.find('.a-account-shell-user-chip').text()).toContain('Peter');
    });
});
