/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LdapIdentityProvider } from '@authup/core-kit';
import zod from 'zod';
import { extractLdapIdentityProviderProtocolAttributes } from './extract';

const schema = zod.object({
    url: zod.string().url(),
    timeout: zod.number().min(0).optional().nullable(),
    start_tls: zod.boolean().optional().nullable(),
    tls: zod.any().optional().nullable(),
    base_dn: zod.string().min(3).max(2000).optional()
        .nullable(),
    user: zod.string().min(3),
    password: zod.string().min(3),
    user_base_dn: zod.string().optional().nullable(),
    user_filter: zod.string().optional().nullable(),
    username_attribute: zod.string().optional().nullable(),
    mail_attribute: zod.string().optional().nullable(),
    display_name_attribute: zod.string().optional().nullable(),
    group_base_dn: zod.string().optional().nullable(),
    group_filter: zod.string().optional().nullable(),
    group_name_attribute: zod.string().optional().nullable(),
    group_class: zod.string().optional().nullable(),
    group_member_attribute: zod.string().optional().nullable(),
    group_member_user_attribute: zod.string().optional().nullable(),
});

/**
 * @throws ZodError
 * @param body
 */
export function validateLdapIdentityProviderProtocol(
    body: Record<string, any>,
) : Partial<LdapIdentityProvider> {
    const attributes = extractLdapIdentityProviderProtocolAttributes(body);
    const result = schema.safeParse(attributes);
    if (result.success === false) {
        throw result.error;
    }

    return result.data;
}
