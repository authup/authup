/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, User } from '@authup/core-kit';
import { MappingSynchronizationMode, isValidUserEmail, isValidUserName } from '@authup/core-kit';
import {
    createNanoID,
    getJWTClaimBy,
    hasOwnProperty,
    isScalar,
    toArray,
    toArrayElement,
    toStringArray,
} from '@authup/kit';
import { isObject } from 'smob';
import type { DataSource, Repository } from 'typeorm';
import type { IdentityProviderFlowIdentity } from '../identity-provider';
import { IdentityProviderAttributeMappingEntity } from '../identity-provider-attribute-mapping';
import { IdentityProviderPermissionMappingEntity } from '../identity-provider-permission-mapping';
import { IdentityProviderRoleMappingEntity } from '../identity-provider-role-mapping';
import type { UserEntity } from '../user';
import { UserRepository } from '../user';
import { IdentityProviderAccountEntity } from './entity';

type UserCreateContext = {
    names: string[],
    emails: string[]
};

type ClaimAttribute = {
    value: unknown[] | unknown,
    mode?: `${MappingSynchronizationMode}` | null
};

export class IdentityProviderAccountManger {
    protected dataSource : DataSource;

    protected provider : IdentityProvider;

    protected userRepository: UserRepository;

    protected userAttributes : (keyof User)[] = [
        'first_name',
        'last_name',
        'avatar',
        'cover',
        'display_name',
    ];

    protected providerAccountRepository : Repository<IdentityProviderAccountEntity>;

    constructor(
        dataSource: DataSource,
        provider: IdentityProvider,
    ) {
        this.dataSource = dataSource;
        this.provider = provider;

        this.userRepository = new UserRepository(dataSource);
        this.providerAccountRepository = dataSource.getRepository(IdentityProviderAccountEntity);
    }

    async saveByIdentity(identity: IdentityProviderFlowIdentity) : Promise<IdentityProviderAccountEntity> {
        let account = await this.providerAccountRepository.findOne({
            where: {
                provider_user_id: identity.id,
                provider_id: this.provider.id,
            },
            relations: ['user'],
        });

        let user : UserEntity;

        if (account) {
            user = await this.updateUserByIdentity(account.user, identity);
        } else {
            user = await this.createUserFromIdentity(identity);

            account = this.providerAccountRepository.create({
                provider_id: this.provider.id,
                provider_user_id: identity.id,
                provider_user_name: user.name, // todo: parse identity.name
                user_id: user.id,
                user,
            });
        }

        await this.saveRoles(user.id, identity);
        await this.savePermissions(user.id, identity);

        return account;
    }

    protected async saveRoles(userId: string, identity: IdentityProviderFlowIdentity) {
        const providerRoleRepository = this.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const entities = await providerRoleRepository.findBy({
            provider_id: this.provider.id,
        });

        const roleIds : string[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity.name || !entity.value) {
                roleIds.push(entity.role_id);
                continue;
            }

            const value = getJWTClaimBy(
                identity.claims,
                entity.name,
                entity.value,
                entity.value_is_regex,
            );

            if (typeof value !== 'undefined') {
                roleIds.push(entity.role_id);

                continue;
            }

            if (entity.synchronization_mode === MappingSynchronizationMode.ONCE) {
                roleIds.push(entity.role_id);
            }
        }

        if (roleIds.length > 0) {
            await this.userRepository.syncRoles(
                userId,
                roleIds,
            );
        }
    }

    protected async savePermissions(userId: string, identity: IdentityProviderFlowIdentity) {
        const providerRoleRepository = this.dataSource.getRepository(IdentityProviderPermissionMappingEntity);
        const entities = await providerRoleRepository.findBy({
            provider_id: this.provider.id,
        });

        const ids : string[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity.name || !entity.value) {
                ids.push(entity.permission_id);
                continue;
            }

            const value = getJWTClaimBy(
                identity.claims,
                entity.name,
                entity.value,
                entity.value_is_regex,
            );

            if (typeof value !== 'undefined') {
                ids.push(entity.permission_id);

                continue;
            }

            if (entity.synchronization_mode === MappingSynchronizationMode.ONCE) {
                ids.push(entity.permission_id);
            }
        }

        if (ids.length > 0) {
            await this.userRepository.syncPermissions(
                userId,
                ids,
            );
        }
    }

    protected async getAttributesFromIdentity(identity: IdentityProviderFlowIdentity) : Promise<Record<string, ClaimAttribute>> {
        const repository = this.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const entities = await repository.findBy({
            provider_id: this.provider.id,
        });

        const attributes : Record<string, ClaimAttribute> = {};

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const value = getJWTClaimBy(
                identity.claims,
                entity.source_name,
                entity.source_value,
                entity.source_value_is_regex,
            );

            if (typeof value === 'undefined') {
                continue;
            }

            if (entity.target_value) {
                attributes[entity.target_name] = {
                    value: [entity.target_value],
                    mode: entity.synchronization_mode,
                };
            } else {
                attributes[entity.target_name] = {
                    value,
                    mode: entity.synchronization_mode,
                };
            }
        }

        return attributes;
    }

    protected async updateUserByIdentity(
        user: UserEntity,
        identity: IdentityProviderFlowIdentity,
    ) : Promise<UserEntity> {
        const claimAttributes = await this.getAttributesFromIdentity(identity);
        const extra = await this.userRepository.findExtraAttributesByPrimaryColumn(user.id);

        const columnNames = this.userRepository.metadata.columns.map(
            (column) => column.propertyName,
        );

        const claimAttributeKeys = Object.keys(claimAttributes);
        for (let i = 0; i < claimAttributeKeys.length; i++) {
            const attributeKey = claimAttributeKeys[i];

            const mode = claimAttributes[attributeKey].mode ||
                MappingSynchronizationMode.ALWAYS;

            const value = toArrayElement(claimAttributes[attributeKey].value);
            if (!isScalar(value) || typeof value === 'undefined') {
                continue;
            }

            const index = columnNames.indexOf(attributeKey);
            if (index === -1) {
                if (typeof extra[attributeKey] !== 'undefined') {
                    if (mode === MappingSynchronizationMode.ONCE) {
                        continue;
                    }
                }

                // todo: run validation on attribute value
                extra[attributeKey] = value;
            } else {
                const isAllowed = this.userAttributes.includes(attributeKey);
                if (!isAllowed) {
                    continue;
                }

                if (typeof user[attributeKey] !== 'undefined') {
                    if (mode === MappingSynchronizationMode.ONCE) {
                        continue;
                    }
                }

                // todo: run validation on attribute value
                user[attributeKey] = value;
            }
        }

        await this.userRepository.saveWithAttributes(user, extra);

        return user;
    }

    protected async createUserFromIdentity(
        identity: IdentityProviderFlowIdentity,
    ) : Promise<UserEntity> {
        const claimAttributes = await this.getAttributesFromIdentity(identity);

        const names = toArray(identity.name);
        const mails = toArray(identity.email);

        const columnNames = this.userRepository.metadata.columns.map(
            (column) => column.propertyName,
        );

        const user = this.userRepository.create({});
        const extra : Record<string, any> = {};

        const claimAttributeKeys = Object.keys(claimAttributes);
        for (let i = 0; i < claimAttributeKeys.length; i++) {
            const attributeKey = claimAttributeKeys[i];
            const attribute = claimAttributes[attributeKey];

            const index = columnNames.indexOf(attributeKey);
            if (index === -1) {
                const value = toArrayElement(attribute.value);
                if (!isScalar(value) || typeof value === 'undefined') {
                    continue;
                }

                // todo: run validation on attribute value
                extra[attributeKey] = value;
            } else {
                const isAllowed = this.userAttributes.includes(attributeKey);
                if (!isAllowed) {
                    continue;
                }

                switch (attributeKey) {
                    case 'name': {
                        const values = toStringArray(attribute.value);
                        if (values.length > 0) {
                            names.push(...values);
                        }
                        break;
                    }
                    case 'email': {
                        const values = toStringArray(attribute.value);
                        if (values.length > 0) {
                            mails.push(...values);
                        }
                        break;
                    }
                    default: {
                        const value = toArrayElement(attribute.value);
                        if (!isScalar(value) || typeof value === 'undefined') {
                            continue;
                        }

                        // todo: run validation on attribute value
                        user[attributeKey] = value;
                        break;
                    }
                }
            }
        }

        return this.tryToCreateUser(user, extra, {
            names,
            emails: mails,
        });
    }

    protected async tryToCreateUser(
        user: UserEntity,
        extraAttributes: Record<string, any>,
        context: UserCreateContext,
    ) {
        while (!user.name && context.names.length > 0) {
            if (isValidUserName(context.names[0])) {
                [user.name] = context.names;
                break;
            }

            context.names.shift();
        }

        let nameLocked = true;
        if (!user.name) {
            user.name = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_', 30);
            nameLocked = false;
        }

        while (!user.email && context.emails.length > 0) {
            if (isValidUserEmail(context.emails[0])) {
                [user.email] = context.emails;
                break;
            }

            context.emails.shift();
        }

        // todo: if base.email or base.name is undefined, throw error

        try {
            user.display_name = user.display_name || user.name;
            user.name_locked = nameLocked;
            user.realm_id = this.provider.realm_id;
            user.active = true;

            await this.userRepository.saveWithAttributes(user, extraAttributes);

            return user;
        } catch (e) {
            if (isObject(e)) {
                const code : string | undefined = hasOwnProperty(e, 'code') && typeof e.code === 'string' ?
                    e.code :
                    undefined;

                if (
                    code === 'ER_DUP_ENTRY' ||
                    code === 'SQLITE_CONSTRAINT_UNIQUE'
                ) {
                    user.name = undefined;
                    return this.tryToCreateUser(user, extraAttributes, context);
                }
            }

            throw e;
        }
    }
}
