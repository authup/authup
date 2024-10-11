/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider,
    IdentityProviderPermissionMapping,
    IdentityProviderRoleMapping,
    User,
} from '@authup/core-kit';
import {
    IdentityProviderMappingSyncMode,
    isValidUserEmail,
    isValidUserName,
} from '@authup/core-kit';
import {
    createNanoID,
    getJWTClaimByPattern,
    isScalar,
    toArray,
    toArrayElement,
    toStringArray,
} from '@authup/kit';
import { BadRequestError } from '@ebec/http';
import type { DataSource, Repository } from 'typeorm';
import type {
    IdentityProviderIdentity,
    UserEntity,
    UserRelationSyncItem,
} from '../../domains';
import {
    IdentityProviderAccountEntity,
    IdentityProviderAttributeMappingEntity,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderRoleMappingEntity,
    UserRelationItemSyncOperation,
    UserRepository,
} from '../../domains';

type UserCreateContext = {
    attempts: number,
    attributes: UserEntity,
    attributesExtra: Record<string, any>,
    attributeNamePool: string[],
    attributeEmailPool: string[]
};

type ClaimAttribute = {
    value: unknown[],
    mode?: `${IdentityProviderMappingSyncMode}` | null
};

export class IDPAccountService {
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

    async save(identity: IdentityProviderIdentity) : Promise<IdentityProviderAccountEntity> {
        const account = await this.saveAccount(identity);

        await this.saveRoles(identity, account);
        await this.savePermissions(identity, account);

        return account;
    }

    protected async saveAccount(identity: IdentityProviderIdentity) : Promise<IdentityProviderAccountEntity> {
        let account = await this.providerAccountRepository.findOne({
            where: {
                provider_user_id: identity.id,
                provider_id: this.provider.id,
            },
            relations: ['user'],
        });

        if (account) {
            account.user = await this.updateUser(identity, account.user);

            identity.status = 'updated';
        } else {
            const user = await this.createUser(identity);

            account = this.providerAccountRepository.create({
                provider_id: this.provider.id,
                provider_user_id: identity.id,
                provider_user_name: user.name, // todo: parse identity.name
                provider_realm_id: this.provider.realm_id,
                user,
                user_id: user.id,
                user_realm_id: user.realm_id,
            });

            identity.status = 'created';
        }

        await this.providerAccountRepository.save(account);

        return account;
    }

    protected async saveRoles(
        identity: IdentityProviderIdentity,
        account: IdentityProviderAccountEntity,
    ) {
        const providerRoleRepository = this.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const entities = await providerRoleRepository.findBy({
            provider_id: this.provider.id,
        });

        const items : UserRelationSyncItem[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            items.push({
                id: entity.role_id,
                realmId: entity.role_realm_id,
                operation: this.getSyncOperationForMapping(identity, entity),
            });
        }

        await this.userRepository.syncRoles({
            items,
            id: account.user_id,
            realmId: account.user_realm_id,
        });
    }

    protected async savePermissions(
        identity: IdentityProviderIdentity,
        account: IdentityProviderAccountEntity,
    ) {
        const providerRoleRepository = this.dataSource.getRepository(IdentityProviderPermissionMappingEntity);
        const entities = await providerRoleRepository.findBy({
            provider_id: this.provider.id,
        });

        const items : UserRelationSyncItem[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            items.push({
                id: entity.permission_id,
                realmId: entity.permission_realm_id,
                operation: this.getSyncOperationForMapping(identity, entity),
            });
        }

        await this.userRepository.syncPermissions({
            items,
            id: account.user_id,
            realmId: account.user_realm_id,
        });
    }

    protected getSyncOperationForMapping(
        identity: IdentityProviderIdentity,
        mapping: IdentityProviderPermissionMapping | IdentityProviderRoleMapping,
    ) {
        let operation : UserRelationItemSyncOperation;
        if (
            mapping.synchronization_mode === IdentityProviderMappingSyncMode.ONCE &&
            identity.status === 'updated'
        ) {
            operation = UserRelationItemSyncOperation.NONE;
        } else if (!mapping.name || !mapping.value) {
            operation = UserRelationItemSyncOperation.CREATE;
        } else {
            const value = getJWTClaimByPattern(
                identity.data,
                mapping.name,
                mapping.value,
                mapping.value_is_regex,
            );

            if (value.length === 0) {
                operation = UserRelationItemSyncOperation.DELETE;
            } else {
                operation = UserRelationItemSyncOperation.CREATE;
            }
        }

        return operation;
    }

    protected async getClaimAttributes(identity: IdentityProviderIdentity) : Promise<Record<string, ClaimAttribute>> {
        const repository = this.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const entities = await repository.findBy({
            provider_id: this.provider.id,
        });

        const attributes : Record<string, ClaimAttribute> = {};

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const value = getJWTClaimByPattern(
                identity.data,
                entity.source_name,
                entity.source_value,
                entity.source_value_is_regex,
            );

            if (value.length === 0) {
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
        identity: IdentityProviderIdentity,
        user: UserEntity,
    ) : Promise<UserEntity> {
        const claimAttributes = await this.getClaimAttributes(identity);
        const extra = await this.userRepository.findExtraAttributesByPrimaryColumn(user.id);

        const columnPropertyNames = this.userRepository.metadata.columns.map((c) => c.propertyName);
        const relationPropertyNames = this.userRepository.metadata.relations.map((r) => r.propertyName);

        const claimAttributeKeys = Object.keys(claimAttributes);
        for (let i = 0; i < claimAttributeKeys.length; i++) {
            const attributeKey = claimAttributeKeys[i];

            let index : number = relationPropertyNames.indexOf(attributeKey);
            if (index !== -1) {
                continue;
            }

            const mode = claimAttributes[attributeKey].mode ||
                IdentityProviderMappingSyncMode.ALWAYS;

            const value = toArrayElement(claimAttributes[attributeKey].value);
            if (!isScalar(value) || typeof value === 'undefined') {
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
        identity: IdentityProviderIdentity,
    ) : Promise<UserEntity> {
        const claimAttributes = await this.getClaimAttributes(identity);

        const names = toArray(identity.name);
        const emails = toArray(identity.email);

        const columnPropertyNames = this.userRepository.metadata.columns.map((c) => c.propertyName);
        const relationPropertyNames = this.userRepository.metadata.relations.map((r) => r.propertyName);

        const user = this.userRepository.create({});
        const extra : Record<string, any> = {};

        const claimAttributeKeys = Object.keys(claimAttributes);
        for (let i = 0; i < claimAttributeKeys.length; i++) {
            const attributeKey = claimAttributeKeys[i];
            let index : number = relationPropertyNames.indexOf(attributeKey);
            if (index !== -1) {
                continue;
            }

            const attribute = claimAttributes[attributeKey];

            index = columnPropertyNames.indexOf(attributeKey);
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
