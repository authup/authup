/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    IdentityProviderAccount,
    KeycloakJWTPayload,
    OAuth2IdentityProvider,
    OAuth2TokenGrantResponse,
    OpenIDConnectIdentityProvider,
    TokenError,
    User,
    createNanoID, hasOwnProperty, isValidUserName,
} from '@authelion/common';
import { decodeToken } from '@authelion/server-common';
import { isObject } from 'smob';
import { useDataSource } from 'typeorm-extension';
import { UserEntity, UserRepository } from '../user';
import { IdentityProviderAccountEntity } from './entity';
import { IdentityProviderRoleEntity } from '../identity-provider-role';

export async function createOauth2ProviderAccount(
    provider: OAuth2IdentityProvider | OpenIDConnectIdentityProvider,
    tokenResponse: OAuth2TokenGrantResponse,
) : Promise<IdentityProviderAccount> {
    const payload = decodeToken(tokenResponse.access_token) as string | KeycloakJWTPayload;

    if (typeof payload === 'string') {
        throw TokenError.payloadInvalid();
    }

    const dataSource = await useDataSource();
    const accountRepository = dataSource.getRepository(IdentityProviderAccountEntity);
    let account = await accountRepository.findOne({
        where: {
            provider_user_id: payload.sub,
            provider_id: provider.id,
        },
        relations: ['user'],
    });

    const expiresIn : number = ((payload.exp as number) - (payload.iat as number));
    const expireDate: Date = new Date(((payload.iat as number) * 1000) + (expiresIn * 1000));

    if (account) {
        account = accountRepository.merge(account, {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_at: expireDate,
            expires_in: expiresIn,
        });
    } else {
        const names : string[] = [
            payload.preferred_username,
            payload.nickname,
            payload.sub,
        ].filter((n) => n);

        const user = await createUser({
            realm_id: provider.realm_id,
        }, [...names]);

        account = accountRepository.create({
            provider_id: provider.id,
            provider_user_id: payload.sub,
            provider_user_name: names.shift(),
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_at: expireDate,
            expires_in: expiresIn,
            user_id: user.id,
            user,
        });
    }

    await accountRepository.save(account);

    const roles : string[] = [];

    if (
        payload.roles &&
        Array.isArray(payload.roles)
    ) {
        payload.roles = payload.roles
            .filter((n) => typeof n === 'string');

        if (
            payload.roles &&
            payload.roles.length > 0
        ) {
            roles.push(...payload.roles);
        }
    }

    if (
        payload.realm_access?.roles &&
        Array.isArray(payload.realm_access?.roles)
    ) {
        payload.realm_access.roles = payload.realm_access?.roles
            .filter((n) => typeof n === 'string');

        if (
            payload.realm_access.roles &&
            payload.realm_access.roles.length > 0
        ) {
            roles.push(...payload.realm_access.roles);
        }
    }

    // todo: maybe remove all existing roles, if user has revoked roles.

    if (
        roles &&
        roles.length > 0
    ) {
        const providerRoleRepository = dataSource.getRepository(IdentityProviderRoleEntity);

        const providerRoles = await providerRoleRepository
            .createQueryBuilder('providerRole')
            .leftJoinAndSelect('providerRole.provider', 'provider')
            .where('providerRole.external_id in (:...id)', { id: roles })
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
