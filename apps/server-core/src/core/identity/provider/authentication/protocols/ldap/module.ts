/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LdapIdentityProvider, User } from '@authup/core-kit';
import { EntityCredentialsInvalidError } from '@authup/errors';
import type { Result } from '@authup/kit';
import { template } from '@authup/kit';
import ldap from 'ldapjs';
import type { Filter } from 'ldapjs';
import { BaseCredentialsAuthenticator } from '../../../../../authentication/index.ts';
import type { ILdapClient } from '../../../../../ldap/index.ts';
import type { IIdentityProviderAccountManager } from '../../../account/index.ts';
import type { IdentityProviderIdentity } from '../../../types.ts';
import type { IdentityProviderLdapAuthenticatorContext } from './types.ts';

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
            startTLS: ctx.provider.startTls,
            baseDn: ctx.provider.baseDn,
            user: ctx.provider.user,
            password: ctx.provider.password,
            userNameAttribute: ctx.provider.userNameAttribute,
        });
    }

    async authenticate(name: string, password: string) : Promise<User> {
        let bind = await this.safeBind();
        if (!bind.success) {
            await this.safeUnbind();

            throw new EntityCredentialsInvalidError({ entity: 'user' });
        }

        const entity = await this.findOneByName(name);
        if (!entity) {
            await this.safeUnbind();
            throw new EntityCredentialsInvalidError({ entity: 'user' });
        }

        const identity : IdentityProviderIdentity = {
            id: entity.dn,
            attributeCandidates: {
                name: [
                    entity[this.provider.userNameAttribute || 'cn'],
                    this.extractCnFromDn(entity.dn),
                ],
                email: [
                    entity[this.provider.userMailAttribute || 'mail'],
                ],
            },
            data: entity,
            provider: this.provider,
        };

        try {
            identity.roles = await this.findUserGroups(entity);
        } catch {
            // todo: log event
        }

        bind = await this.safeBind(identity.id, password);
        await this.safeUnbind();

        if (!bind.success) {
            throw new EntityCredentialsInvalidError({ entity: 'user' });
        }

        const account = await this.accountManager.save(identity);

        return account.user;
    }

    protected async bind(user?: string, password?: string) : Promise<void> {
        if (!user) {
            return this.client.bind();
        }

        if (!this.client.isDn(user)) {
            const nameAttribute = this.provider.userNameAttribute || 'cn';
            user = `${nameAttribute}=${user},${this.client.resolveDn(this.provider.userBaseDn, this.provider.baseDn)}`;
        }

        return this.client.bind(user, password);
    }

    protected async safeBind(user?: string, password?: string) : Promise<Result<null>> {
        try {
            await this.bind(user, password);

            return {
                success: true,
                data: null, 
            };
        } catch (e) {
            return {
                success: false,
                error: e as Error, 
            };
        }
    }

    protected async unbind() : Promise<void> {
        return this.client.unbind();
    }

    protected async safeUnbind() : Promise<Result<null>> {
        try {
            await this.unbind();

            return {
                success: true,
                data: null, 
            };
        } catch (e) {
            return {
                success: false,
                error: e as Error, 
            };
        }
    }

    protected async findOneByName(input: string) : Promise<Record<string, any> | null> {
        let filter : Filter | string;

        if (this.provider.userFilter) {
            filter = template(this.provider.userFilter, {
                input,
                name_attribute: this.provider.userNameAttribute || 'cn',
                mail_attribute: this.provider.userMailAttribute || 'mail',
                display_name_attribute: this.provider.userDisplayNameAttribute || 'cn',
            });
        } else if (this.provider.userNameAttribute) {
            filter = new ldap.EqualityFilter({
                attribute: this.provider.userNameAttribute,
                value: input,
            });
        } else {
            filter = new ldap.OrFilter({
                filters: [
                    new ldap.EqualityFilter({
                        attribute: 'cn',
                        value: input,
                    }),
                    new ldap.EqualityFilter({
                        attribute: 'sAMAccountName',
                        value: input,
                    }),
                ],
            });
        }

        const entities = await this.client.search({
            filter,
            scope: 'sub',
        }, this.client.resolveDn(this.provider.userBaseDn, this.provider.baseDn));

        if (entities.length === 0) {
            return null;
        }

        return entities[0];
    }

    protected extractCnFromDn(dn: string) : string | undefined {
        const match = /^cn=([^,]+)/i.exec(dn);
        return match ? match[1].trim() : undefined;
    }

    public async findUserGroups(user: Record<string, any>) : Promise<string[]> {
        const nameAttribute = this.provider.groupNameAttribute || 'cn';
        const memberAttribute = this.provider.groupMemberAttribute || 'member';

        let filter : Filter | string;
        if (this.provider.groupFilter) {
            filter = template(this.provider.groupFilter, {
                ...user,
                name_attribute: nameAttribute,
                member_attribute: memberAttribute,
            });
        } else {
            filter = new ldap.AndFilter({
                filters: [
                    new ldap.EqualityFilter({
                        attribute: 'objectClass',
                        value: this.provider.groupClass || 'group',
                    }),
                    new ldap.EqualityFilter({
                        attribute: memberAttribute,
                        value: user[this.provider.groupMemberUserAttribute || 'dn'],
                    }),
                ],
            });
        }

        const entities = await this.client.search({
            filter,
            scope: 'sub',
        }, this.client.resolveDn(this.provider.groupBaseDn, this.provider.baseDn));

        if (entities.length === 0) {
            return [];
        }

        const attributeKey = this.provider.groupNameAttribute || 'cn';
        const names : string[] = [];
        for (const entity of entities) {
            const attribute = entity[attributeKey];
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
