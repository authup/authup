/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider,
    IdentityProviderAccount,
    User,
} from '@authup/core';
import {
    createNanoID, hasOwnProperty, isValidUserName,
} from '@authup/core';
import { isObject } from 'smob';
import { useDataSource } from 'typeorm-extension';
import type { IdentityProviderFlowIdentity } from '../identity-provider';
import type { UserEntity } from '../user';
import { UserRepository } from '../user';
import { IdentityProviderAccountEntity } from './entity';
import { IdentityProviderRoleEntity } from '../identity-provider-role';

export async function createOauth2ProviderAccount(
    provider: IdentityProvider,
    identity: IdentityProviderFlowIdentity,
) : Promise<IdentityProviderAccount> {
    const dataSource = await useDataSource();
    const accountRepository = dataSource.getRepository(IdentityProviderAccountEntity);
    let account = await accountRepository.findOne({
        where: {
            provider_user_id: `${identity.id}`,
            provider_id: provider.id,
        },
        relations: ['user'],
    });

    if (!account) {
        let names : string[];
        if (Array.isArray(identity.name)) {
            names = identity.name;
        } else {
            names = [identity.name];
        }

        const user = await createUser({
            realm_id: provider.realm_id,
        }, [...names]);

        account = accountRepository.create({
            provider_id: provider.id,
            provider_user_id: `${identity.id}`,
            provider_user_name: names.shift(),
            user_id: user.id,
            user,
        });
    }

    await accountRepository.save(account);

    if (identity.roles && identity.roles.length > 0) {
        const providerRoleRepository = dataSource.getRepository(IdentityProviderRoleEntity);

        const providerRoles = await providerRoleRepository
            .createQueryBuilder('providerRole')
            .leftJoinAndSelect('providerRole.provider', 'provider')
            .where('providerRole.external_id in (:...id)', { id: identity.roles })
            .andWhere('provider.realm_id = :realmId', { realmId: provider.realm_id })
            .getMany();

        if (
            providerRoles.length > 0
        ) {
            const userRepository = new UserRepository(dataSource);
            await userRepository.syncRoles(
                account.user.id,
                providerRoles.map((providerRole) => providerRole.role_id),
            );
        }
    }

    return account;
}

async function createUser(data: Partial<User>, names: string[]) : Promise<UserEntity> {
    let name : string | undefined = names.shift();
    let nameLocked = true;

    if (!name) {
        name = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_', 30);
        nameLocked = false;
    }

    if (!isValidUserName(name)) {
        return createUser(data, names);
    }

    try {
        const dataSource = await useDataSource();
        const userRepository = new UserRepository(dataSource);
        const user = userRepository.create({
            name,
            name_locked: nameLocked,
            display_name: name,
            realm_id: data.realm_id,
            active: true,
        });

        await userRepository.insert(user);

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
                return createUser(data, names);
            }
        }

        throw e;
    }
}
