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

    it('should label the back link with the host via tooltip and aria-label', () => {
        const { wrapper } = mountKitComponent(AAccountShell, { items, backLink: 'https://example.com/dashboard' });

        const link = wrapper.find('.a-account-shell-nav-link--back');
        expect(link.exists()).toBeTruthy();
        expect(link.attributes('href')).toEqual('https://example.com/dashboard');
        // Visible text stays short; the host rides the tooltip and the
        // accessible name, so an icon-plus-"Back" entry is still announced
        // with its target.
        expect(link.text()).not.toContain('example.com');
        expect(link.attributes('title')).toContain('example.com');
        expect(link.attributes('aria-label')).toContain('example.com');
    });

    it('should render the back link as the first nav entry', () => {
        const { wrapper } = mountKitComponent(AAccountShell, { items, backLink: 'https://example.com/dashboard' });

        const links = wrapper.findAll('.a-account-shell-nav-link');
        expect(links).toHaveLength(items.length + 1);
        expect(links[0].classes()).toContain('a-account-shell-nav-link--back');
        expect(links[1].text()).toContain('Overview');
    });

    it('should render no back link when backLink is not a parseable URL', () => {
        const { wrapper } = mountKitComponent(AAccountShell, { items, backLink: 'not-a-url' });

        expect(wrapper.find('.a-account-shell-nav-link--back').exists()).toBeFalsy();
    });

    it('should render no back link for a non-http(s) scheme', () => {
        // Defence in depth: validating backLink is the host's job, but the
        // component must not render an ftp:/app-scheme link if a host
        // mis-wires it. `javascript:` has no host and falls out anyway.
        // eslint-disable-next-line no-script-url
        for (const backLink of ['ftp://example.com/x', 'javascript:alert(1)']) {
            const { wrapper } = mountKitComponent(AAccountShell, { items, backLink });

            expect(wrapper.find('.a-account-shell-nav-link--back').exists()).toBeFalsy();
        }
    });

    it('should render no back link when backLink is absent', () => {
        const { wrapper } = mountKitComponent(AAccountShell, { items });

        expect(wrapper.find('.a-account-shell-nav-link--back').exists()).toBeFalsy();
    });
});

describe('AAuthApp', () => {
    it('should render host gadgets inside the gadget cluster', () => {
        const { wrapper } = mountKitComponent(AAuthApp, {}, {}, {}, { slots: { gadgets: '<button data-test="sign-out" type="button" class="a-auth-gadget" />' } });

        expect(wrapper.find('.a-auth-gadgets [data-test="sign-out"]').exists()).toBeTruthy();
    });
});
