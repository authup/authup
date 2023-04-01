/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AbilityDescriptor } from '@authup/common';
import {
    AbilityManager,
    HeaderError, OAuth2SubKind,
    OAuth2TokenKind,
    ScopeName,
    TokenError, transformOAuth2ScopeToArray,
} from '@authup/common';
import type {
    AuthorizationHeader,
    BasicAuthorizationHeader,
    BearerAuthorizationHeader,
} from 'hapic';
import {
    AuthorizationHeaderType,
} from 'hapic';
import { buildKeyPath } from 'redis-extension';
import type { Request } from 'routup';
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { useConfig } from '../../../../config';
import { CachePrefix } from '../../../../database';
import type {
    ClientEntity,
    RobotEntity,

    UserEntity,
} from '../../../../domains';
import {
    OAuth2ClientRepository,
    RealmEntity,
    RobotRepository,
    UserRepository,
} from '../../../../domains';
import {
    loadOAuth2SubEntity,
    loadOAuth2SubPermissions,
    readOAuth2TokenPayload,
} from '../../../oauth2';
import { setRequestEnv } from '../../../utils';

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
            id: buildKeyPath({
                prefix: CachePrefix.REALM,
                id: payload.realm_id,
            }),
            milliseconds: 60.000,
        },
    });
    setRequestEnv(request, 'realm', realm);

    const sub = await loadOAuth2SubEntity(payload.sub_kind, payload.sub, payload.scope);
    const permissions = await loadOAuth2SubPermissions(payload.sub_kind, payload.sub, payload.scope);

    setRequestEnv(request, 'ability', new AbilityManager(permissions));

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
    let permissions : AbilityDescriptor[] = [];

    const config = await useConfig();
    const dataSource = await useDataSource();

    if (
        config.get('env') === 'test' &&
        header.username === config.get('adminUsername') &&
        header.password === config.get('adminPassword')
    ) {
        const userRepository = new UserRepository(dataSource);
        const entity = await userRepository.findOne({
            where: {
                name: 'admin',
            },
            relations: {
                realm: true,
            },
            cache: true,
        });

        if (!entity) {
            throw new NotFoundError();
        }

        await userRepository.appendAttributes(entity);

        permissions = await userRepository.getOwnedPermissions(entity.id);

        setRequestEnv(request, 'ability', new AbilityManager(permissions));
        setRequestEnv(request, 'scopes', [ScopeName.GLOBAL]);

        setRequestEnv(request, 'user', entity);
        setRequestEnv(request, 'userId', entity.id);
        setRequestEnv(request, 'realm', entity.realm);

        return;
    }

    const robotRepository = new RobotRepository(dataSource);
    const robot = await robotRepository.verifyCredentials(header.username, header.password);
    if (robot) {
        // allow authentication but not authorization with basic auth for robots!
        setRequestEnv(request, 'ability', new AbilityManager());
        setRequestEnv(request, 'scopes', [ScopeName.GLOBAL]);

        setRequestEnv(request, 'robot', robot);
        setRequestEnv(request, 'robotId', robot.id);
        setRequestEnv(request, 'realm', robot.realm);
    }

    const oauth2ClientRepository = new OAuth2ClientRepository(dataSource);
    const oauth2Client = await oauth2ClientRepository.verifyCredentials(header.username, header.password);
    if (oauth2Client) {
        // allow authentication but not authorization with basic auth for robots!
        setRequestEnv(request, 'ability', new AbilityManager());
        setRequestEnv(request, 'scopes', [ScopeName.GLOBAL]);

        setRequestEnv(request, 'client', oauth2Client);
        setRequestEnv(request, 'clientId', oauth2Client.id);
        setRequestEnv(request, 'realm', oauth2Client.realm);
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
