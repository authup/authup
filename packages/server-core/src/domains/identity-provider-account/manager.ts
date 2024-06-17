/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, User } from '@authup/core-kit';
import { IdentityProviderMappingSyncMode, isValidUserEmail, isValidUserName } from '@authup/core-kit';
import {
    createNanoID,
    getJWTClaim,
    isScalar,
    toArray,
    toArrayElement,
    toStringArray,
} from '@authup/kit';
import { BadRequestError } from '@ebec/http';
import type { DataSource, Repository } from 'typeorm';
import type { IdentityProviderFlowIdentity } from '../identity-provider';
import { IdentityProviderAttributeMappingEntity } from '../identity-provider-attribute-mapping';
import { IdentityProviderPermissionMappingEntity } from '../identity-provider-permission-mapping';
import { IdentityProviderRoleMappingEntity } from '../identity-provider-role-mapping';
import type { UserEntity, UserRelationItemSyncConfig } from '../user';
import { UserRelationItemSyncOperation, UserRepository } from '../user';
import { IdentityProviderAccountEntity } from './entity';

type UserCreateContext = {
    attempts: number,
    attributes: UserEntity,
    attributesExtra: Record<string, any>,
    attributeNamePool: string[],
    attributeEmailPool: string[]
};

type ClaimAttribute = {
    value: unknown[] | unknown,
    mode?: `${IdentityProviderMappingSyncMode}` | null
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

    async save(identity: IdentityProviderFlowIdentity) : Promise<IdentityProviderAccountEntity> {
        let account = await this.providerAccountRepository.findOne({
            where: {
                provider_user_id: identity.id,
                provider_id: this.provider.id,
            },
            relations: ['user'],
        });

        let user : UserEntity;
        let userExisted : boolean;

        if (account) {
            user = await this.updateUser(identity, account.user);
            userExisted = true;
        } else {
            user = await this.createUser(identity);
            userExisted = false;

            account = this.providerAccountRepository.create({
                provider_id: this.provider.id,
                provider_user_id: identity.id,
                provider_user_name: user.name, // todo: parse identity.name
                user_id: user.id,
                user,
            });
        }

        await this.saveRoles(identity, user.id, userExisted);
        await this.savePermissions(identity, user.id, userExisted);

        return account;
    }

    protected async saveRoles(
        identity: IdentityProviderFlowIdentity,
        userId: string,
        userExisted: boolean,
    ) {
        const providerRoleRepository = this.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const entities = await providerRoleRepository.findBy({
            provider_id: this.provider.id,
        });

        const roles : UserRelationItemSyncConfig[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            if (!entity.name || !entity.value) {
                roles.push({
                    id: entity.role_id,
                    operation: entity.synchronization_mode === IdentityProviderMappingSyncMode.ONCE && userExisted ?
                        UserRelationItemSyncOperation.NONE :
                        undefined,
                });
                continue;
            }

            const value = getJWTClaim(
                identity.claims,
                entity.name,
                entity.value,
                entity.value_is_regex,
            );

            roles.push({
                id: entity.role_id,
                operation: (entity.synchronization_mode === IdentityProviderMappingSyncMode.ONCE && userExisted) || typeof value === 'undefined' ?
                    UserRelationItemSyncOperation.NONE :
                    undefined,
            });
        }

        await this.userRepository.syncRoles(
            userId,
            roles,
        );
    }

    protected async savePermissions(
        identity: IdentityProviderFlowIdentity,
        userId: string,
        userExisted: boolean,
    ) {
        const providerRoleRepository = this.dataSource.getRepository(IdentityProviderPermissionMappingEntity);
        const entities = await providerRoleRepository.findBy({
            provider_id: this.provider.id,
        });

        const permissions : UserRelationItemSyncConfig[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity.name || !entity.value) {
                permissions.push({
                    id: entity.permission_id,
                    operation: entity.synchronization_mode === IdentityProviderMappingSyncMode.ONCE && userExisted ?
                        UserRelationItemSyncOperation.NONE :
                        undefined,
                });
                continue;
            }

            const value = getJWTClaim(
                identity.claims,
                entity.name,
                entity.value,
                entity.value_is_regex,
            );

            permissions.push({
                id: entity.permission_id,
                operation: (entity.synchronization_mode === IdentityProviderMappingSyncMode.ONCE && userExisted) || typeof value === 'undefined' ?
                    UserRelationItemSyncOperation.NONE :
                    undefined,
            });
        }

        await this.userRepository.syncPermissions(
            userId,
            permissions,
        );
    }

    protected async getClaimAttributes(identity: IdentityProviderFlowIdentity) : Promise<Record<string, ClaimAttribute>> {
        const repository = this.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const entities = await repository.findBy({
            provider_id: this.provider.id,
        });

        const attributes : Record<string, ClaimAttribute> = {};

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const value = getJWTClaim(
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

    protected async updateUser(
        identity: IdentityProviderFlowIdentity,
        user: UserEntity,
    ) : Promise<UserEntity> {
        const claimAttributes = await this.getClaimAttributes(identity);
        const extra = await this.userRepository.findExtraAttributesByPrimaryColumn(user.id);

        const columnPropertyNames = this.userRepository.metadata.columns.map((c) => c.propertyName);
        const relationPropertyNames = this.userRepository.metadata.relations.map((r) => r.propertyName);

        const claimAttributeKeys = Object.keys(claimAttributes);
        for (let i = 0; i < claimAttributeKeys.length; i++) {
            const attributeKey = claimAttributeKeys[i];

            const mode = claimAttributes[attributeKey].mode ||
                IdentityProviderMappingSyncMode.ALWAYS;

            const value = toArrayElement(claimAttributes[attributeKey].value);
            if (!isScalar(value) || typeof value === 'undefined') {
                continue;
            }

            let index : number = relationPropertyNames.indexOf(attributeKey);
            if (index !== -1) {
                continue;
            }

            index = columnPropertyNames.indexOf(attributeKey);
            if (index === -1) {
                if (typeof extra[attributeKey] !== 'undefined') {
                    if (mode === IdentityProviderMappingSyncMode.ONCE) {
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
                    if (mode === IdentityProviderMappingSyncMode.ONCE) {
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

    protected async createUser(
        identity: IdentityProviderFlowIdentity,
    ) : Promise<UserEntity> {
        const claimAttributes = await this.getClaimAttributes(identity);

        const names = toArray(identity.name);
        const emails = toArray(identity.email);

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
                            emails.push(...values);
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

        return this.tryToCreateUser({
            attributes: user,
            attributesExtra: extra,
            attempts: 0,
            attributeNamePool: names,
            attributeEmailPool: emails,
        });
    }

    protected async tryToCreateUser(context: UserCreateContext) {
        context.attempts++;

        if (context.attempts >= 5) {
            throw new BadRequestError('The user could not be created.');
        }

        while (
            !context.attributes.name &&
            context.attributeNamePool.length > 0
        ) {
            const name = context.attributeNamePool.shift();
            if (name && isValidUserName(name)) {
                context.attributes.name = name;
                break;
            }
        }

        while (
            !context.attributes.email &&
            context.attributeEmailPool.length > 0
        ) {
            const email = context.attributeEmailPool.shift();
            if (email && isValidUserEmail(email)) {
                context.attributes.email = email;
                break;
            }
        }

        try {
            context.attributes.name = context.attributes.name || createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_', 30);
            context.attributes.display_name = context.attributes.display_name || context.attributes.name;
            context.attributes.name_locked = false;
            context.attributes.realm_id = this.provider.realm_id;
            context.attributes.active = true;

            await this.userRepository.saveWithAttributes(context.attributes, context.attributesExtra);

            return context.attributes;
        } catch (e) {
            // the only reason this query should fail, is due unique constraint ^^
            context.attributes.name = undefined;
            return this.tryToCreateUser(context);
        }
    }
}
