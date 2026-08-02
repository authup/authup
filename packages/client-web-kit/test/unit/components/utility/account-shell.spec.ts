/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import AAccountShell from '../../../../src/components/utility/AAccountShell.vue';
import AAuthApp from '../../../../src/components/utility/AAuthApp.vue';
import type { AAccountShellNavItem } from '../../../../src/components/utility/types';
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
        expect(links[0].attributes('aria-current')).toEqual('page');
        expect(links[1].classes()).not.toContain('a-account-shell-nav-link--active');
        expect(links[1].attributes('aria-current')).toBeUndefined();
    });

    it('should render the content slot inside the body card', () => {
        const { wrapper } = mountKitComponent(AAccountShell, { items }, {}, {}, { slots: { default: '<span data-test="content">content</span>' } });

        expect(wrapper.find('.a-account-shell-body [data-test="content"]').exists()).toBeTruthy();
    });
});

describe('AAuthApp', () => {
    it('should render host gadgets inside the gadget cluster', () => {
        const { wrapper } = mountKitComponent(AAuthApp, {}, {}, {}, { slots: { gadgets: '<button data-test="sign-out" type="button" class="a-auth-gadget" />' } });

        expect(wrapper.find('.a-auth-gadgets [data-test="sign-out"]').exists()).toBeTruthy();
    });
});
