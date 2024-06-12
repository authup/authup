/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { template } from '@authup/kit';
import {
    AndFilter, EqualityFilter, OrFilter,
} from 'ldapjs';
import type { Filter } from 'ldapjs';
import { LdapClient } from '../../../../core';
import type { ILdapIdentityProviderFlow, IdentityProviderFlowIdentity, LdapIdentityProviderFlowOptions } from '../types';

export class LdapIdentityProviderFlow implements ILdapIdentityProviderFlow {
    protected options : LdapIdentityProviderFlowOptions;

    protected client: LdapClient;

    constructor(options: LdapIdentityProviderFlowOptions) {
        this.options = options;

        this.client = new LdapClient({
            url: options.url,
            tls: options.tls,
            startTLS: options.start_tls,
            baseDn: options.base_dn,
            user: options.user,
            password: options.password,
            userNameAttribute: options.user_name_attribute,
        });
    }

    async getIdentityForCredentials(user: string, password: string) : Promise<IdentityProviderFlowIdentity> {
        const identity = await this.getIdentity(user);

        await this.bind(identity.id, password);

        return identity;
    }

    async getIdentity(input: string): Promise<IdentityProviderFlowIdentity> {
        await this.bind();

        const user = await this.findUser(input);
        const identity : IdentityProviderFlowIdentity = {
            id: user.dn,
            name: user[this.options.user_name_attribute || 'cn'] || user.dn,
            email: user[this.options.user_mail_attribute || 'mail'],
            claims: {},
        };

        try {
            identity.roles = await this.findUserGroups(user);
        } catch (e) {
            // todo: log event
        }

        return identity;
    }

    public async bind(user?: string, password?: string) : Promise<void> {
        if (!user) {
            return this.client.bind();
        }

        if (!this.client.isDn(user)) {
            const nameAttribute = this.options.user_name_attribute || 'cn';
            user = `${nameAttribute}=${user},${this.client.resolveDn(this.options.user_base_dn, this.options.base_dn)}`;
        }

        return this.client.bind(user, password);
    }

    async unbind() : Promise<void> {
        return this.client.unbind();
    }

    public async findUser(input: string) : Promise<Record<string, any> | undefined> {
        let filter : Filter | string;

        if (this.options.user_filter) {
            filter = template(this.options.user_filter, {
                input,
                name_attribute: this.options.user_name_attribute || 'cn',
                mail_attribute: this.options.user_mail_attribute || 'mail',
                display_name_attribute: this.options.user_display_name_attribute || 'cn',
            });
        } else if (this.options.user_name_attribute) {
            filter = new EqualityFilter({
                attribute: this.options.user_name_attribute,
                value: input,
            });
        } else {
            filter = new OrFilter({
                filters: [
                    new EqualityFilter({
                        attribute: 'cn',
                        value: input,
                    }),
                    new EqualityFilter({
                        attribute: 'sAMAccountName',
                        value: input,
                    }),
                ],
            });
        }

        const entities = await this.client.search({
            filter,
            scope: 'sub',
        }, this.client.resolveDn(this.options.user_base_dn, this.options.base_dn));

        if (entities.length === 0) {
            return undefined;
        }

        return entities[0];
    }

    public async findUserGroups(user: Record<string, any>) : Promise<string[]> {
        const nameAttribute = this.options.group_name_attribute || 'cn';
        const memberAttribute = this.options.group_member_attribute || 'member';

        let filter : Filter | string;
        if (this.options.group_filter) {
            filter = template(this.options.group_filter, {
                ...user,
                name_attribute: nameAttribute,
                member_attribute: memberAttribute,
            });
        } else {
            filter = new AndFilter({
                filters: [
                    new EqualityFilter({
                        attribute: 'objectClass',
                        value: this.options.group_class || 'group',
                    }),
                    new EqualityFilter({
                        attribute: memberAttribute,
                        value: user[this.options.group_member_user_attribute || 'dn'],
                    }),
                ],
            });
        }

        const entities = await this.client.search({
            filter,
            scope: 'sub',
        }, this.client.resolveDn(this.options.group_base_dn, this.options.base_dn));

        if (entities.length === 0) {
            return [];
        }

        const attributeKey = this.options.group_name_attribute || 'cn';
        const names : string[] = [];
        for (let i = 0; i < entities.length; i++) {
            const attribute = entities[i][attributeKey];
            if (typeof attribute === 'undefined') {
                continue;
            }

            if (typeof attribute === 'string') {
                names.push(attribute);
                continue;
            }

            if (Array.isArray(attribute)) {
                names.push(...attribute.filter((el) => typeof el === 'string'));
            }
        }

        return names;
    }
}
