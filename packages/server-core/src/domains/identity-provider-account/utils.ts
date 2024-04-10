/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider,
    IdentityProviderAccount,
} from '@authup/core-kit';
import {
    createNanoID,
    hasOwnProperty,
    isValidUserEmail,
    isValidUserName,
} from '@authup/core-kit';
import { isObject } from 'smob';
import { useDataSource } from 'typeorm-extension';
import type { IdentityProviderFlowIdentity } from '../identity-provider';
import type { UserEntity } from '../user';
import { UserRepository } from '../user';
import { IdentityProviderAccountEntity } from './entity';
import { IdentityProviderRoleEntity } from '../identity-provider-role';

export async function createIdentityProviderAccount(
    provider: IdentityProvider,
    identity: IdentityProviderFlowIdentity,
) : Promise<IdentityProviderAccount> {
    const dataSource = await useDataSource();
    const accountRepository = dataSource.getRepository(IdentityProviderAccountEntity);
    let account = await accountRepository.findOne({
        where: {
            provider_user_id: identity.id,
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

        let mails : string[];
        if (identity.email) {
            if (Array.isArray(identity.email)) {
                mails = identity.email;
            } else {
                mails = [identity.email];
            }
        } else {
            mails = [];
        }

        // preserve idp name
        const [name] = names;

        const user = await createUser({
            realmId: provider.realm_id,
            mails,
            names,
        });

        account = accountRepository.create({
            provider_id: provider.id,
            provider_user_id: identity.id,
            provider_user_name: name,
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

type UserCreateContext = {
    names: string[],
    mails: string[],
    realmId: string
};

async function createUser(context: UserCreateContext) : Promise<UserEntity> {
    let name : string | undefined;
    while (!name && context.names.length > 0) {
        if (isValidUserName(context.names[0])) {
            [name] = context.names;
            break;
        }

        context.names.shift();
    }

    let nameLocked = true;
    if (!name) {
        name = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_', 30);
        nameLocked = false;
    }

    let email : string | undefined;
    while (!email && context.mails.length > 0) {
        if (isValidUserEmail(context.mails[0])) {
            [email] = context.mails;
            break;
        }

        context.mails.shift();
    }

    try {
        const dataSource = await useDataSource();
        const userRepository = new UserRepository(dataSource);
        const user = userRepository.create({
            name,
            name_locked: nameLocked,
            display_name: name,
            realm_id: context.realmId,
            active: true,
            email,
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
                return createUser(context);
            }
        }

        throw e;
    }
}
