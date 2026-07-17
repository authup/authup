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
    startTls?: boolean,

    /**
     * Controls the TLS connection validation process.
     */
    tls?: Record<string, any>,

    /**
     * Sets the base distinguished name container for all LDAP queries.
     */
    baseDn: string,

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
    userBaseDn?: string,

    /**
     * The LDAP filter to narrow down which users are valid
     */
    userFilter?: string,

    /**
     *  It will be used with the value in username to
     *  construct a ldap filter as ({attribute}={username}) to find the user and get user details in LDAP
     */
    userNameAttribute?: string,

    /**
     * The attribute to retrieve which contains the users email addresses.
     */
    userMailAttribute?: string,

    /**
     * The attribute to retrieve which is shown on the Web UI to the user when they log in.
     */
    userDisplayNameAttribute?: string,

    /**
     * Ff specified with groupClass, will serve as search base for authenticated user groups
     */
    groupBaseDn?: string,

    /**
     * Similar to userFilter, but it applies to group searches.
     */
    groupFilter?: string,

    /**
     * The LDAP attribute that is used to determine the group name.
     */
    groupNameAttribute?: string,

    /**
     * If specified with groupsSearchBase, will be used as objectClass in search filter for authenticated user groups
     */
    groupClass?: string,

    /**
     * if specified with groupClass and groupsSearchBase,
     * will be used as member name (if not specified this defaults to member) in search filter for authenticated user groups
     */
    groupMemberAttribute?: string,

    /**
     * if specified with groupClass and groupsSearchBase,
     * will be used as the attribute on the user object (if not specified this defaults to dn) in search filter for authenticated user groups
     */
    groupMemberUserAttribute?: string
}
