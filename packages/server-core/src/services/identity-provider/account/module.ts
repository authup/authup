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
    UserValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import {
    createNanoID,
    extendObject,
    toArray,
    toArrayElement,
} from '@authup/kit';
import { getJWTClaimByPattern } from '@authup/specs';
import { BadRequestError } from '@ebec/http';
import { assign } from 'smob';
import type { DataSource, Repository } from 'typeorm';
import { ValidupNestedError } from 'validup';
import type {
    UserEntity,
    UserRelationSyncItem,
} from '../../../database/domains';
import {
    IdentityProviderAccountEntity,
    IdentityProviderAttributeMappingEntity,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderRoleMappingEntity,
    UserRelationItemSyncOperation,
    UserRepository,
} from '../../../database/domains';
import type { IdentityProviderIdentity } from '../flow';

type ClaimAttribute = {
    value: unknown[],
    mode?: `${IdentityProviderMappingSyncMode}` | null
};

export class IdentityProviderAccountService {
    protected dataSource : DataSource;

    protected provider : IdentityProvider;

    protected userRepository: UserRepository;

    protected userValidator : UserValidator;

    protected providerAccountRepository : Repository<IdentityProviderAccountEntity>;

    constructor(
        dataSource: DataSource,
        provider: IdentityProvider,
    ) {
        this.dataSource = dataSource;
        this.provider = provider;

        this.userRepository = new UserRepository(dataSource);
        this.userValidator = new UserValidator();

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

        await this.userRepository.saveRoles({
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

        await this.userRepository.savePermissions({
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

    protected async getClaimAttributes(
        identity: IdentityProviderIdentity,
        validatorGroup: ValidatorGroup,
    ) : Promise<Record<string, ClaimAttribute>> {
        const repository = this.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const entities = await repository.findBy({
            provider_id: this.provider.id,
        });

        const attributes: Record<string, ClaimAttribute> = {};

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

            if (
                validatorGroup === ValidatorGroup.UPDATE &&
                entity.synchronization_mode === IdentityProviderMappingSyncMode.ONCE
            ) {
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

    groupClaimAttributes(input: Record<string, ClaimAttribute>) {
        const columnPropertyNames = this.userRepository.metadata.columns.map((c) => c.propertyName);
        const relationPropertyNames = this.userRepository.metadata.relations.map((r) => r.propertyName);

        const internalAllowed = [
            'first_name',
            'last_name',
            'avatar',
            'cover',
            'display_name',
        ];

        const internal : Partial<User> = {};
        const external : Record<string, any> = {};

        const inputKeys = Object.keys(input);
        for (let i = 0; i < inputKeys.length; i++) {
            const attributeKey = inputKeys[i];

            let index : number = relationPropertyNames.indexOf(attributeKey);
            if (index !== -1) {
                continue;
            }

            const value = toArrayElement(input[attributeKey].value);
            if (typeof value === 'undefined') {
                continue;
            }

            index = columnPropertyNames.indexOf(attributeKey);
            if (index === -1) {
                external[attributeKey] = value;
            } else {
                const internalAllowedIndex = internalAllowed.indexOf(attributeKey);
                if (internalAllowedIndex !== -1) {
                    internal[attributeKey] = value;
                }
            }
        }

        return [internal, external];
    }

    protected async updateUser(
        identity: IdentityProviderIdentity,
        entity: UserEntity,
    ) : Promise<UserEntity> {
        const claimAttributes = await this.getClaimAttributes(
            identity,
            ValidatorGroup.UPDATE,
        );

        const [
            attributesNew,
            attributesExtraNew,
        ] = this.groupClaimAttributes(claimAttributes);

        const attributesExtraOld = await this.userRepository.findOneWithEAByPrimaryColumn(entity.id);
        const attributesExtra = assign(attributesExtraOld, attributesExtraNew);

        const attributesNewKeys = Object.keys(attributesNew);
        while (attributesNewKeys.length > 0) {
            try {
                const validation = await this.userValidator.run(attributesNew, {
                    pathsToInclude: attributesNewKeys,
                    group: ValidatorGroup.UPDATE,
                });

                extendObject(entity, validation);

                break;
            } catch (e) {
                if (
                    !(e instanceof ValidupNestedError) ||
                    e.children.length === 0
                ) {
                    throw new Error('Unknown validation error occurred.');
                }

                let keysDeleted = 0;

                for (let i = 0; i < e.children.length; i++) {
                    const child = e.children[i];

                    const index = attributesNewKeys.indexOf(child.path);
                    if (index !== -1) {
                        attributesNewKeys.splice(index, 1);
                        keysDeleted++;
                    }
                }

                if (keysDeleted === 0) {
                    throw new Error('Validation errors can not be fixed.');
                }
            }
        }

        await this.userRepository.saveOneWithEA(entity, attributesExtra);

        return entity;
    }

    protected async createUser(
        identity: IdentityProviderIdentity,
    ) : Promise<UserEntity> {
        const claimAttributes = await this.getClaimAttributes(
            identity,
            ValidatorGroup.CREATE,
        );

        const [
            attributes,
            attributesExtra,
        ] = this.groupClaimAttributes(claimAttributes);

        attributes.name_locked = false;
        attributes.realm_id = this.provider.realm_id;
        attributes.active = true;

        const namePool = toArray(identity.name);
        const emailPool = toArray(identity.email);

        let attempts : number = 0;
        while (attempts < 10) {
            attempts++;

            let validationResult : User;

            try {
                validationResult = await this.userValidator.run(attributes, {
                    group: ValidatorGroup.CREATE,
                });
            } catch (e: any) {
                if (!(e instanceof ValidupNestedError)) {
                    throw new Error('Unknown validation error occurred.');
                }

                let retry = false;
                for (let i = 0; i < e.children.length; i++) {
                    const child = e.children[i];

                    if (
                        child.path === 'name' &&
                        namePool.length > 0
                    ) {
                        attributes.name = namePool.shift();
                        retry = true;
                        break;
                    }

                    if (child.path === 'email') {
                        if (emailPool.length > 0) {
                            attributes.email = emailPool.shift();
                        } else {
                            attributes.email = null;
                        }

                        retry = true;
                        break;
                    }
                }

                if (retry) {
                    continue;
                } else {
                    throw e;
                }
            }

            try {
                const output = this.userRepository.create(validationResult);
                await this.userRepository.saveOneWithEA(output, attributesExtra);

                return output;
            } catch (e) {
                // todo: check for conflict error :)
                if (namePool.length > 0) {
                    attributes.name = namePool.shift();
                } else {
                    attributes.name = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_', 30);
                }
            }
        }

        throw new BadRequestError('The user could not be created.');
    }
}
