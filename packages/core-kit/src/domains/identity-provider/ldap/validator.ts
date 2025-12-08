/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import { IdentityProviderProtocol } from '../constants';
import type { LdapIdentityProvider } from './types';

export class IdentityProviderLDAPAttributesValidator extends Container<LdapIdentityProvider> {
    protected initialize() {
        super.initialize();

        this.mount(
            'protocol',
            createValidator(zod.string().check((ctx) => {
                if (ctx.value !== IdentityProviderProtocol.LDAP) {
                    ctx.issues.push({
                        input: ctx.value,
                        code: 'custom',
                        message: 'The protocol should be LDAP.',
                    });
                }
            })),
        );

        this.mount('url', createValidator(zod.url()));

        this.mount('timeout', { optional: true }, createValidator(zod.number().min(0).optional().nullable()));

        this.mount('start_tls', { optional: true }, createValidator(zod.boolean().optional().nullable()));

        this.mount('tls', { optional: true }, createValidator(zod.any().optional().nullable()));

        this.mount(
            'base_dn',
            { optional: true },
            createValidator(zod.string().min(3).max(2000).optional()
                .nullable()),
        );
        this.mount('user', createValidator(zod.string().min(3)));

        this.mount('password', createValidator(zod.string().min(3)));

        this.mount('user_base_dn', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('user_filter', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('user_name_attribute', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('user_mail_attribute', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('user_display_name_attribute', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('group_base_dn', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('group_filter', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('group_name_attribute', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('group_class', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('group_member_attribute', { optional: true }, createValidator(zod.string().optional().nullable()));

        this.mount('group_member_user_attribute', { optional: true }, createValidator(zod.string().optional().nullable()));
    }
}
