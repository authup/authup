/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '@authup/kit';
import type { LdapIdentityProvider } from '@authup/core-kit';

export function extractLdapIdentityProviderProtocolAttributes(
    input: unknown,
) : Partial<LdapIdentityProvider> {
    if (!isObject(input)) {
        return {};
    }

    const attributes : (keyof LdapIdentityProvider)[] = [
        'url',
        'timeout',
        'start_tls',
        'tls',
        'base_dn',
        'user',
        'password',
        'user_base_dn',
        'user_filter',
        'user_name_attribute',
        'user_mail_attribute',
        'user_display_name_attribute',
        'group_base_dn',
        'group_filter',
        'group_name_attribute',
        'group_class',
        'group_member_attribute',
        'group_member_user_attribute',
    ];

    const output : Partial<LdapIdentityProvider> = {};

    for (let i = 0; i < attributes.length; i++) {
        const attribute = attributes[i];
        if (!hasOwnProperty(input, attribute)) {
            continue;
        }

        output[attributes[i] as string] = input[attribute];
    }

    return output;
}
