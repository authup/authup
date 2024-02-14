/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/core';
import {
    AndFilter, EqualityFilter, OrFilter, createClient,
} from 'ldapjs';
import type { Client, Filter, SearchOptions } from 'ldapjs';
import type { ILdapIdentityProviderFlow, IdentityProviderFlowIdentity, LdapIdentityProviderFlowOptions } from '../types';

type LdapUser = {
    dn: string,
    [key: string]: any
};

function isLdapDn(input: string) {
    return input.includes('cn=') || input.includes('dc=');
}

export class LdapIdentityProviderFlow implements ILdapIdentityProviderFlow {
    protected options : LdapIdentityProviderFlowOptions;

    protected client: Client;

    constructor(options: LdapIdentityProviderFlowOptions) {
        this.options = options;
        this.client = createClient({
            url: options.url,
            connectTimeout: 3000,
        });
    }

    async getIdentityForCredentials(user: string, password: string): Promise<IdentityProviderFlowIdentity> {
        // verify user & password combination
        await this.bind(user, password);
        await this.unbind();

        await this.bind();

        const ldapUser = await this.searchUser(user);

        const identity : IdentityProviderFlowIdentity = {
            id: ldapUser.dn,
            name: ldapUser.dn,
        };

        if (
            this.options.user_name_attribute &&
            ldapUser[this.options.user_name_attribute]
        ) {
            identity.name = ldapUser[this.options.user_name_attribute];
        }

        if (
            this.options.user_mail_attribute &&
            ldapUser[this.options.user_mail_attribute]
        ) {
            identity.email = Array.isArray(ldapUser[this.options.user_mail_attribute]) ?
                ldapUser[this.options.user_mail_attribute].pop() :
                ldapUser[this.options.user_mail_attribute];
        }

        try {
            identity.roles = await this.searchUserGroups(ldapUser);
        } catch (e) {
            // todo: log event
        }

        return identity;
    }

    public async bind(user?: string, password?: string) {
        if (this.client.connected || this.client.connecting) {
            await this.unbind();
        }

        return new Promise<Client>((resolve, reject) => {
            this.client.connect();

            this.client.once('connect', () => {
                this.establishSecureConnection()
                    .then(() => {
                        if (!user) {
                            user = this.options.user;
                            password = this.options.password;
                        }

                        // todo: throw on undefined

                        const nameAttribute = this.options.user_name_attribute || 'cn';

                        if (!isLdapDn(user)) {
                            if (this.options.user_base_dn) {
                                user = `${nameAttribute}=${user},${this.options.user_base_dn}`;
                            } else {
                                user = `${nameAttribute}=${user},${this.options.base_dn}`;
                            }
                        }

                        this.client.bind(user, password, (err) => {
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
            if (!this.options.start_tls) {
                resolve();
                return;
            }

            this.client.starttls(this.options.tls, null, (err) => {
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
            if (this.options.user_name_attribute) {
                filter = new EqualityFilter({
                    attribute: this.options.user_name_attribute,
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

    public async searchUserGroups(user: LdapUser) : Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const groupMemberAttribute = this.options.group_member_attribute || 'member';
            const groupMemberUserAttribute = this.options.group_member_user_attribute || 'dn';

            const searchOptions : SearchOptions = {
                filter: new AndFilter({
                    filters: [
                        new EqualityFilter({
                            attribute: 'objectclass',
                            value: this.options.group_class || 'group',
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

                const entities: string[] = [];

                const groupNameAttribute = this.options.group_name_attribute || 'cn';
                res.on('searchEntry', (searchEntry) => {
                    if (!hasOwnProperty(searchEntry.pojo.attributes, groupNameAttribute)) {
                        return;
                    }

                    const groupName = searchEntry.pojo.attributes[groupNameAttribute];
                    if (Array.isArray(groupName)) {
                        // todo: check if array elements are strings
                        entities.push(...groupName);
                    } else if (typeof groupName === 'string') {
                        entities.push(groupName);
                    }
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
