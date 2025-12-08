/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount, User } from '@authup/core-kit';
import { UserValidator, ValidatorGroup } from '@authup/core-kit';
import { createNanoID, extendObject } from '@authup/kit';
import { ValidupNestedError } from 'validup';
import type { IUserIdentityRepository } from '../../entities';
import { IdentityProviderIdentityOperation } from '../constants';
import type { IIdentityProviderMapper } from '../mapper';
import { IdentityProviderMapperOperation } from '../mapper';
import type { IdentityProviderIdentity } from '../types';
import type { IIdentityProviderAccountManager, IIdentityProviderAccountRepository, IdentityProviderAccountManagerContext } from './types';

export class IdentityProviderAccountManager implements IIdentityProviderAccountManager {
    protected attributesMapper : IIdentityProviderMapper;

    protected permissionMapper : IIdentityProviderMapper;

    protected roleMapper : IIdentityProviderMapper;

    protected repository : IIdentityProviderAccountRepository;

    protected userRepository: IUserIdentityRepository;

    protected userValidator : UserValidator;

    constructor(ctx: IdentityProviderAccountManagerContext) {
        this.attributesMapper = ctx.attributeMapper;
        this.permissionMapper = ctx.permissionMapper;
        this.roleMapper = ctx.roleMapper;
        this.repository = ctx.repository;
        this.userRepository = ctx.userRepository;

        this.userValidator = new UserValidator();
    }

    async save(identity: IdentityProviderIdentity): Promise<IdentityProviderAccount> {
        let account = await this.repository.findOneByProviderIdentity(identity);
        if (account) {
            identity.operation = IdentityProviderIdentityOperation.UPDATE;

            account.user = await this.saveUser(identity, account.user);

            await this.repository.save(account);

            await this.saveRoles(identity, account.user);
            await this.savePermissions(identity, account.user);

            return account;
        }

        identity.operation = IdentityProviderIdentityOperation.CREATE;

        const user = await this.saveUser(identity);

        account = await this.repository.save({
            provider_id: identity.provider.id,
            provider_user_id: identity.id,
            provider_user_name: user.name, // todo: parse identity.name
            provider_realm_id: identity.provider.realm_id,
            user,
            user_id: user.id,
            user_realm_id: user.realm_id,
        });

        await this.saveRoles(identity, account.user);
        await this.savePermissions(identity, account.user);

        return account;
    }

    async saveUser(
        identity: IdentityProviderIdentity,
        user?: User,
    ): Promise<User> {
        const attributes = await this.attributesMapper.execute(
            identity,
        );

        const entity : Record<string, any> = {};
        for (let i = 0; i < attributes.length; i++) {
            const attribute = attributes[i];
            if (
                attribute.key &&
                attribute.operation === IdentityProviderMapperOperation.CREATE
            ) {
                // attribute value might be object, array, ...
                entity[attribute.key] = attribute.value;
            }
        }

        if (
            identity.operation === IdentityProviderIdentityOperation.CREATE &&
            identity.attributeCandidates
        ) {
            const attributeCandidateKeys = Object.keys(identity.attributeCandidates);
            for (let i = 0; i < attributeCandidateKeys.length; i++) {
                const key = attributeCandidateKeys[i];
                if (!entity[key]) {
                    continue;
                }

                attributes.push({
                    key,
                    value: identity.attributeCandidates[key].shift(),
                    operation: IdentityProviderMapperOperation.CREATE,
                });
            }
        }

        if (!user) {
            (entity as User).realm_id = identity.provider.realm_id;
            (entity as User).active = true;
            (entity as User).name_locked = true;
            (entity as User).client_id = identity.clientId;
        }

        const attributesSelf = await this.validateAttributes(entity, identity, 10);
        if (!attributesSelf) {
            // todo: better error name
            throw new Error('Identity provider attributes could not be validated.');
        }
        const attributesSelfKeys = Object.keys(attributesSelf);

        const attributesExtra : Record<string, any> = {};

        const entityKeys = Object.keys(entity);
        for (let i = 0; i < entityKeys.length; i++) {
            const index = attributesSelfKeys.indexOf(entityKeys[i]);
            if (index !== -1) {
                continue;
            }

            attributesExtra[entityKeys[i]] = entity[entityKeys[i]];
        }

        let output : User;
        if (user) {
            output = extendObject(user, attributesSelf);
        } else {
            output = attributesSelf;
        }

        let attempts = Math.max((identity.attributeCandidates.name?.length || 0) + 1, 10);
        while (attempts > 0) {
            try {
                // todo: we also need to remove existing ones via idp login flow ( but not other attributes!)
                return await this.userRepository.saveOneWithEA(output, attributesExtra);
            } catch (e) {
                const names = identity.attributeCandidates?.name || [];
                if (names.length > 0) {
                    while (names.length > 0) {
                        output.name = `${names.shift()}`;

                        try {
                            await this.userValidator.run(output, {
                                group: identity.operation === IdentityProviderIdentityOperation.CREATE ?
                                    ValidatorGroup.CREATE :
                                    ValidatorGroup.UPDATE,
                            });
                            break;
                        } catch (e) {
                            // todo: do nothing.
                        }
                    }
                } else {
                    output.name = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_', 10);
                }

                attempts -= 1;
            }
        }

        throw new Error('The user account could not be created due a conflict error.');
    }

    async validateAttributes(
        entity: Record<string, any>,
        identity: IdentityProviderIdentity,
        attempts: number,
    ) : Promise<User | null> {
        attempts--;
        if (attempts <= 0) {
            return null;
        }

        try {
            return await this.userValidator.run(entity, {
                group: identity.operation === IdentityProviderIdentityOperation.CREATE ?
                    ValidatorGroup.CREATE :
                    ValidatorGroup.UPDATE,
            });
        } catch (e: any) {
            if (!(e instanceof ValidupNestedError)) {
                return null;
            }

            let retry = false;
            for (let i = 0; i < e.children.length; i++) {
                const child = e.children[i];

                if (
                    Array.isArray(entity[child.path]) &&
                    entity[child.path].length > 0
                ) {
                    const [first, ...rest] = entity[child.path];
                    entity[child.path] = first;

                    if (rest.length > 0) {
                        if (!identity.attributeCandidates) {
                            identity.attributeCandidates = {};
                        }

                        if (!identity.attributeCandidates[child.path]) {
                            identity.attributeCandidates[child.path] = [];
                        }

                        identity.attributeCandidates[child.path].push(...rest);
                    }

                    retry = true;
                    break;
                }

                if (
                    identity.attributeCandidates &&
                    identity.attributeCandidates[child.path] &&
                    identity.attributeCandidates[child.path].length > 0
                ) {
                    entity[child.path] = identity.attributeCandidates[child.path].shift();
                    retry = true;
                    break;
                }

                if (entity[child.path]) {
                    entity[child.path] = null;
                    break;
                }
            }

            if (retry) {
                return this.validateAttributes(entity, identity, attempts);
            }

            return null;
        }
    }

    async savePermissions(
        identity: IdentityProviderIdentity,
        user: User,
    ) {
        const entities = await this.permissionMapper.execute(identity);

        await this.userRepository.savePermissions(user, entities);
    }

    async saveRoles(
        identity: IdentityProviderIdentity,
        user: User,
    ) {
        const entities = await this.roleMapper.execute(identity);

        await this.userRepository.saveRoles(user, entities);
    }
}
