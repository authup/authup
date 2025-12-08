/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '../entity';
import type { IdentityProviderProtocol } from '../constants';

export interface LdapIdentityProvider extends IdentityProvider {
    protocol: IdentityProviderProtocol.LDAP | `${IdentityProviderProtocol.LDAP}`;

    /**
     * The LDAP URL which consists of a scheme, address, and port.
     * Format is <scheme>://<address>:<port> or <scheme>://<address> where scheme is either ldap or ldaps.
     */
    url: string,

    /**
     * The timeout for dialing an LDAP connection.
     *
     * @default infinity
     */
    timeout?: number,

    /**
     * Enables use of the LDAP StartTLS process which is not commonly used.
     */
    start_tls?: boolean,

    /**
     * Controls the TLS connection validation process.
     */
    tls?: Record<string, any>,

    /**
     * Sets the base distinguished name container for all LDAP queries.
     */
    base_dn: string,

    /**
     * The DN of the administrator.
     *
     * @example cn=read-only-admin,dc=example,dc=com
     */
    user?: string,
    /**
     * The password of the administrator.
     */
    password?: string,

    /**
     * The ldap base DN to search the user.
     * @example dc=example,dc=com
     */
    user_base_dn?: string,

    /**
     * The LDAP filter to narrow down which users are valid
     */
    user_filter?: string,

    /**
     *  It will be used with the value in username to
     *  construct a ldap filter as ({attribute}={username}) to find the user and get user details in LDAP
     */
    user_name_attribute?: string,

    /**
     * The attribute to retrieve which contains the users email addresses.
     */
    user_mail_attribute?: string,

    /**
     * The attribute to retrieve which is shown on the Web UI to the user when they log in.
     */
    user_display_name_attribute?: string,

    /**
     * Ff specified with groupClass, will serve as search base for authenticated user groups
     */
    group_base_dn?: string,

    /**
     * Similar to user_filter, but it applies to group searches.
     */
    group_filter?: string,

    /**
     * The LDAP attribute that is used to determine the group name.
     */
    group_name_attribute?: string,

    /**
     * If specified with groupsSearchBase, will be used as objectClass in search filter for authenticated user groups
     */
    group_class?: string,

    /**
     * if specified with groupClass and groupsSearchBase,
     * will be used as member name (if not specified this defaults to member) in search filter for authenticated user groups
     */
    group_member_attribute?: string,

    /**
     * if specified with groupClass and groupsSearchBase,
     * will be used as the attribute on the user object (if not specified this defaults to dn) in search filter for authenticated user groups
     */
    group_member_user_attribute?: string
}
