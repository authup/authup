/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AndFilter, EqualityFilter, OrFilter, createClient,
} from 'ldapjs';
import type { Client, Filter, SearchOptions } from 'ldapjs';

type LdapUser = {
    dn: string,
    [key: string]: any
};

type LdapGroup = {
    [key: string]: any
};

type LdapIdentityProviderFlowOptions = {
    /**
     * Ldap URL
     */
    url: string | string[],

    /**
     * Timeout in milliseconds.
     *
     * @default infinity
     */
    timeout?: number,

    /**
     * Establish a secure connection.
     */
    startTLS?: boolean,

    /**
     * TLS Options for establishing a secure connection.
     */
    startTLSOptions?: Record<string, any>,

    /**
     * Base dn of all ldap objects.
     */
    base_dn: string,

    /**
     * The DN of the administrator.
     *
     * @example cn=read-only-admin,dc=example,dc=com
     */
    admin_username?: string,
    /**
     * The password of the administrator.
     */
    admin_password?: string,

    /**
     * The ldap base DN to search the user.
     * @example dc=example,dc=com
     */
    user_base_dn?: string,
    /**
     *  It will be used with the value in username to
     *  construct a ldap filter as ({attribute}={username}) to find the user and get user details in LDAP
     */
    username_attribute?: string,

    /**
     * Ff specified with groupClass, will serve as search base for authenticated user groups
     */
    group_base_dn?: string,

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
};

type LdapBindOptions = {
    username?: string,
    password?: string
};

function isLdapDn(input: string) {
    return input.includes('cn=') || input.includes('dc=');
}

export class LdapIdentityProviderFlow {
    protected options : LdapIdentityProviderFlowOptions;

    protected client: Client;

    constructor(options: LdapIdentityProviderFlowOptions) {
        this.options = options;
        this.client = createClient({
            url: options.url,
            connectTimeout: 3000,
        });
    }

    public async bind(options: LdapBindOptions = {}) {
        if (this.client.connected || this.client.connecting) {
            await this.unbind();
        }

        return new Promise<Client>((resolve, reject) => {
            this.client.connect();

            this.client.once('connect', () => {
                this.establishSecureConnection()
                    .then(() => {
                        if (!options.username && !options.password) {
                            options.username = this.options.admin_username;
                            options.password = this.options.admin_password;
                        }

                        // todo: throw on undefined

                        if (!isLdapDn(options.username)) {
                            if (this.options.user_base_dn) {
                                options.username = `cn=${options.username},${this.options.user_base_dn}`;
                            } else {
                                options.username = `cn=${options.username},${this.options.base_dn}`;
                            }
                        }

                        this.client.bind(options.username, options.password, (err) => {
                            if (err) {
                                this.client.unbind();

                                reject(err);
                                return;
                            }

                            resolve(this.client);
                        });
                    })
                    .catch((e) => reject(e));
            });

            this.client.once('timeout', (err) => {
                reject(err);
            });

            this.client.once('connectTimeout', (err) => {
                reject(err);
            });

            this.client.once('error', (err) => {
                reject(err);
            });

            this.client.once('connectError', (error) => {
                if (error) {
                    reject(error);
                }
            });
        });
    }

    public async unbind() : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.client.unbind((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    protected async establishSecureConnection() {
        return new Promise<void>((resolve, reject) => {
            if (!this.options.startTLS) {
                resolve();
                return;
            }

            this.client.starttls(this.options.startTLSOptions, null, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    public async searchUser(username: string) : Promise<LdapUser> {
        return new Promise<LdapUser>((resolve, reject) => {
            let filter : Filter;
            if (this.options.username_attribute) {
                filter = new EqualityFilter({
                    attribute: this.options.username_attribute,
                    value: username,
                });
            } else {
                filter = new OrFilter({
                    filters: [
                        new EqualityFilter({
                            attribute: 'cn',
                            value: username,
                        }),
                        new EqualityFilter({
                            attribute: 'sAMAccountName',
                            value: username,
                        }),
                    ],
                });
            }

            const searchOptions : SearchOptions = {
                filter,
                scope: 'sub',
            };

            const baseDn = this.options.user_base_dn || this.options.base_dn;

            this.client.search(baseDn, searchOptions, (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }

                let entity: LdapUser | undefined;

                res.on('searchEntry', (searchEntry) => {
                    entity = {
                        dn: searchEntry.pojo.objectName,
                    };

                    for (let i = 0; i < searchEntry.pojo.attributes.length; i++) {
                        const attribute = searchEntry.pojo.attributes[i];
                        entity[attribute.type] = attribute.values.length === 1 ?
                            attribute.values[0] :
                            attribute.values;
                    }
                });

                res.on('searchReference', () => {
                    // todo: implement this
                });

                res.on('error', (err) => {
                    reject(err);
                });

                res.on('end', (searchResult) => {
                    if (searchResult.status !== 0 || typeof entity === 'undefined') {
                        reject(new Error('The user could not be found.'));
                    } else {
                        resolve(entity);
                    }
                });
            });
        });
    }

    public async searchUserGroups(user: LdapUser) : Promise<LdapGroup[]> {
        return new Promise<LdapGroup[]>((resolve, reject) => {
            const groupMemberAttribute = this.options.group_member_attribute || 'member';
            const groupMemberUserAttribute = this.options.group_member_user_attribute || 'dn';

            const searchOptions : SearchOptions = {
                filter: new AndFilter({
                    filters: [
                        new EqualityFilter({
                            attribute: 'objectclass',
                            value: this.options.group_class || '*',
                        }),
                        new EqualityFilter({
                            attribute: groupMemberAttribute,
                            value: user[groupMemberUserAttribute],
                        }),
                    ],
                }),
                scope: 'sub',
            };

            const baseDn = this.options.base_dn || this.options.group_base_dn;
            this.client.search(baseDn, searchOptions, (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }

                const entities: LdapGroup[] = [];

                res.on('searchEntry', (searchEntry) => {
                    entities.push(searchEntry.pojo);
                });

                res.on('error', (err) => {
                    reject(err);
                });

                res.on('end', (searchResult) => {
                    if (searchResult.status !== 0) {
                        reject(new Error('The user groups could not be found.'));
                    } else {
                        resolve(entities);
                    }
                });
            });
        });
    }
}
