/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LdapIdentityProvider, User } from '@authup/core-kit';
import { template } from '@authup/kit';
import {
    AndFilter, EqualityFilter, OrFilter,
} from 'ldapjs';
import type { Filter } from 'ldapjs';
import { BaseCredentialsAuthenticator } from '../../../../../authentication';
import type { ILdapClient } from '../../../../../ldap';
import type { IIdentityProviderAccountManager } from '../../../account';
import type { IdentityProviderIdentity } from '../../../types';
import type { IdentityProviderLdapAuthenticatorContext } from './types';

export class IdentityProviderLdapAuthenticator extends BaseCredentialsAuthenticator<User> {
    protected provider : LdapIdentityProvider;

    protected accountManager: IIdentityProviderAccountManager;

    protected client: ILdapClient;

    constructor(ctx: IdentityProviderLdapAuthenticatorContext) {
        super();

        this.accountManager = ctx.accountManager;
        this.provider = ctx.provider;
        this.client = ctx.clientFactory.create({
            url: ctx.provider.url,
            tls: ctx.provider.tls,
            startTLS: ctx.provider.start_tls,
            baseDn: ctx.provider.base_dn,
            user: ctx.provider.user,
            password: ctx.provider.password,
            userNameAttribute: ctx.provider.user_name_attribute,
        });
    }

    async authenticate(user: string, password: string) : Promise<User> {
        let identity : IdentityProviderIdentity;

        try {
            identity = await this.getIdentity(user);

            await this.bind(identity.id, password);
        } finally {
            await this.unbind();
        }

        const account = await this.accountManager.save(identity);

        return account.user;
    }

    protected async getIdentity(input: string): Promise<IdentityProviderIdentity> {
        await this.bind();

        const user = await this.findUser(input);
        const identity : IdentityProviderIdentity = {
            id: user.dn,
            attributeCandidates: {
                name: [
                    user[this.provider.user_name_attribute || 'cn'],
                    user.dn,
                ],
                email: [
                    user[this.provider.user_mail_attribute || 'mail'],
                ],
            },
            data: user,
            provider: this.provider,
        };

        try {
            identity.roles = await this.findUserGroups(user);
        } catch (e) {
            // todo: log event
        }

        return identity;
    }

    protected async bind(user?: string, password?: string) : Promise<void> {
        if (!user) {
            return this.client.bind();
        }

        if (!this.client.isDn(user)) {
            const nameAttribute = this.provider.user_name_attribute || 'cn';
            user = `${nameAttribute}=${user},${this.client.resolveDn(this.provider.user_base_dn, this.provider.base_dn)}`;
        }

        return this.client.bind(user, password);
    }

    protected async unbind() : Promise<void> {
        return this.client.unbind();
    }

    protected async findUser(input: string) : Promise<Record<string, any> | undefined> {
        let filter : Filter | string;

        if (this.provider.user_filter) {
            filter = template(this.provider.user_filter, {
                input,
                name_attribute: this.provider.user_name_attribute || 'cn',
                mail_attribute: this.provider.user_mail_attribute || 'mail',
                display_name_attribute: this.provider.user_display_name_attribute || 'cn',
            });
        } else if (this.provider.user_name_attribute) {
            filter = new EqualityFilter({
                attribute: this.provider.user_name_attribute,
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
        }, this.client.resolveDn(this.provider.user_base_dn, this.provider.base_dn));

        if (entities.length === 0) {
            return undefined;
        }

        return entities[0];
    }

    public async findUserGroups(user: Record<string, any>) : Promise<string[]> {
        const nameAttribute = this.provider.group_name_attribute || 'cn';
        const memberAttribute = this.provider.group_member_attribute || 'member';

        let filter : Filter | string;
        if (this.provider.group_filter) {
            filter = template(this.provider.group_filter, {
                ...user,
                name_attribute: nameAttribute,
                member_attribute: memberAttribute,
            });
        } else {
            filter = new AndFilter({
                filters: [
                    new EqualityFilter({
                        attribute: 'objectClass',
                        value: this.provider.group_class || 'group',
                    }),
                    new EqualityFilter({
                        attribute: memberAttribute,
                        value: user[this.provider.group_member_user_attribute || 'dn'],
                    }),
                ],
            });
        }

        const entities = await this.client.search({
            filter,
            scope: 'sub',
        }, this.client.resolveDn(this.provider.group_base_dn, this.provider.base_dn));

        if (entities.length === 0) {
            return [];
        }

        const attributeKey = this.provider.group_name_attribute || 'cn';
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
