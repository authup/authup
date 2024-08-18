/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '@authup/permitus';
import { PermissionChecker, PermissionMemoryProvider } from '@authup/permitus';
import {
    HeaderError,
    OAuth2SubKind,
    OAuth2TokenKind,
    TokenError,
} from '@authup/kit';
import {
    ScopeName,
    transformOAuth2ScopeToArray,
} from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    AuthorizationHeader,
    BasicAuthorizationHeader,
    BearerAuthorizationHeader,
} from 'hapic';
import {
    AuthorizationHeaderType,
} from 'hapic';
import type { Request } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useConfig } from '../../../../config';
import type {
    ClientEntity,
    RobotEntity,

    UserEntity,
} from '../../../../domains';
import {
    CachePrefix,
    ClientRepository,
    RealmEntity,
    RobotRepository,
    UserRepository,
} from '../../../../domains';
import {
    loadOAuth2SubEntity,
    loadOAuth2SubPermissions,
    readOAuth2TokenPayload,
} from '../../../oauth2';
import { setRequestEnv } from '../../../request';

async function verifyBearerAuthorizationHeader(
    request: Request,
    header: BearerAuthorizationHeader,
) {
    const payload = await readOAuth2TokenPayload(header.token);
    if (payload.kind !== OAuth2TokenKind.ACCESS) {
        throw TokenError.accessTokenRequired();
    }

    setRequestEnv(request, 'token', header.token);
    setRequestEnv(request, 'scopes', transformOAuth2ScopeToArray(payload.scope));

    const dataSource = await useDataSource();
    const realmRepository = dataSource.getRepository(RealmEntity);
    const realm = await realmRepository.findOne({
        where: {
            id: payload.realm_id,
        },
        cache: {
            id: buildRedisKeyPath({
                prefix: CachePrefix.REALM,
                key: payload.realm_id,
            }),
            milliseconds: 60_000,
        },
    });
    setRequestEnv(request, 'realm', realm);
    setRequestEnv(request, 'realmId', realm.id);
    setRequestEnv(request, 'realmName', realm.name);

    const sub = await loadOAuth2SubEntity(payload.sub_kind, payload.sub, payload.scope);
    const permissions = await loadOAuth2SubPermissions(payload.sub_kind, payload.sub, payload.scope);
    const permissionRepository = new PermissionMemoryProvider(permissions);
    setRequestEnv(request, 'permissionChecker', new PermissionChecker({
        provider: permissionRepository,
    }));

    switch (payload.sub_kind) {
        case OAuth2SubKind.CLIENT: {
            setRequestEnv(request, 'client', sub as ClientEntity);
            setRequestEnv(request, 'clientId', payload.sub);
            break;
        }
        case OAuth2SubKind.USER: {
            setRequestEnv(request, 'user', sub as UserEntity);
            setRequestEnv(request, 'userId', payload.sub);
            break;
        }
        case OAuth2SubKind.ROBOT: {
            setRequestEnv(request, 'robot', sub as RobotEntity);
            setRequestEnv(request, 'robotId', payload.sub);
            break;
        }
    }
}

async function verifyBasicAuthorizationHeader(
    request: Request,
    header: BasicAuthorizationHeader,
) {
    let permissions : PermissionItem[] = [];

    const config = useConfig();
    const dataSource = await useDataSource();

    if (config.userAuthBasic) {
        const userRepository = new UserRepository(dataSource);
        const user = await userRepository.verifyCredentials(header.username, header.password);
        if (user) {
            await userRepository.findAndAppendExtraAttributesTo(user);

            permissions = await userRepository.getOwnedPermissions(user.id);

            const permissionRepository = new PermissionMemoryProvider(permissions);
            const permissionChecker = new PermissionChecker({
                provider: permissionRepository,
            });

            setRequestEnv(request, 'permissionChecker', permissionChecker);
            setRequestEnv(request, 'scopes', [ScopeName.GLOBAL]);

            setRequestEnv(request, 'user', user);
            setRequestEnv(request, 'userId', user.id);
            setRequestEnv(request, 'realm', user.realm);
            if (user.realm) {
                setRequestEnv(request, 'realmId', user.realm.id);
                setRequestEnv(request, 'realmName', user.realm.name);
            }

            return;
        }
    }

    if (config.robotAuthBasic) {
        const robotRepository = new RobotRepository(dataSource);
        const robot = await robotRepository.verifyCredentials(header.username, header.password);
        if (robot) {
            permissions = await robotRepository.getOwnedPermissions(robot.id);
            const permissionRepository = new PermissionMemoryProvider(permissions);
            const permissionChecker = new PermissionChecker({
                provider: permissionRepository,
            });

            setRequestEnv(request, 'permissionChecker', permissionChecker);
            setRequestEnv(request, 'scopes', [ScopeName.GLOBAL]);

            setRequestEnv(request, 'robot', robot);
            setRequestEnv(request, 'robotId', robot.id);
            setRequestEnv(request, 'realm', robot.realm);
            if (robot.realm) {
                setRequestEnv(request, 'realmId', robot.realm.id);
                setRequestEnv(request, 'realmName', robot.realm.name);
            }
        }
    }

    if (config.clientAuthBasic) {
        const clientRepository = new ClientRepository(dataSource);
        const oauth2Client = await clientRepository.verifyCredentials(header.username, header.password);
        if (oauth2Client) {
            setRequestEnv(request, 'permissionChecker', new PermissionChecker());
            setRequestEnv(request, 'scopes', [ScopeName.GLOBAL]);

            setRequestEnv(request, 'client', oauth2Client);
            setRequestEnv(request, 'clientId', oauth2Client.id);
            setRequestEnv(request, 'realm', oauth2Client.realm);
            if (oauth2Client.realm) {
                setRequestEnv(request, 'realmId', oauth2Client.realm.id);
                setRequestEnv(request, 'realmName', oauth2Client.realm.name);
            }
        }
    }
}

export async function verifyAuthorizationHeader(
    request: Request,
    header: AuthorizationHeader,
) : Promise<void> {
    switch (header.type) {
        case AuthorizationHeaderType.BEARER:
            return verifyBearerAuthorizationHeader(request, header);
        case AuthorizationHeaderType.BASIC:
            return verifyBasicAuthorizationHeader(request, header);
    }

    throw HeaderError.unsupportedHeaderType(header.type);
}
