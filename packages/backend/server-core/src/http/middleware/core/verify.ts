/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityDescriptor,
    AbilityManager,
    HeaderError, OAuth2Scope,
    OAuth2SubKind,
    OAuth2TokenKind,
    TokenError, transformOAuth2ScopeToArray,
} from '@authelion/common';
import {
    AuthorizationHeader,
    AuthorizationHeaderType,
    BasicAuthorizationHeader,
    BearerAuthorizationHeader,
} from '@trapi/client';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest } from '../../type';
import {
    extractOAuth2TokenPayload,
    loadOAuth2SubEntity,
    loadOAuth2SubPermissions,
} from '../../../oauth2';
import {
    OAuth2ClientEntity,
    OAuth2ClientRepository,
    RobotEntity,
    RobotRepository,
    UserAttributeEntity,
    UserEntity, UserRepository, transformUserAttributes,
} from '../../../domains';
import { buildDatabaseOptionsFromConfig, useDataSource } from '../../../database';
import { useConfig } from '../../../config';

async function verifyBearerAuthorizationHeader(
    request: ExpressRequest,
    header: BearerAuthorizationHeader,
) {
    const payload = await extractOAuth2TokenPayload(header.token);
    if (payload.kind !== OAuth2TokenKind.ACCESS) {
        throw TokenError.accessTokenRequired();
    }

    request.token = header.token;
    request.scopes = transformOAuth2ScopeToArray(payload.scope);

    request.realmId = payload.realm_id;

    const sub = await loadOAuth2SubEntity(payload.sub_kind, payload.sub, payload.scope);
    const permissions = await loadOAuth2SubPermissions(payload.sub_kind, payload.sub, payload.scope);

    request.ability = new AbilityManager(permissions);

    switch (payload.sub_kind) {
        case OAuth2SubKind.CLIENT: {
            request.client = sub as OAuth2ClientEntity;
            request.clientId = payload.sub;
            break;
        }
        case OAuth2SubKind.USER: {
            request.user = sub as UserEntity;
            request.userId = payload.sub;
            break;
        }
        case OAuth2SubKind.ROBOT: {
            request.robot = sub as RobotEntity;
            request.robotId = payload.sub;
            break;
        }
    }
}

async function verifyBasicAuthorizationHeader(
    request: ExpressRequest,
    header: BasicAuthorizationHeader,
) {
    let permissions : AbilityDescriptor[] = [];

    const config = await useConfig();
    const databaseOptions = buildDatabaseOptionsFromConfig(config);
    const dataSource = await useDataSource();

    if (
        config.env === 'test' &&
        header.username === databaseOptions.seed.admin.username &&
        header.password === databaseOptions.seed.admin.password
    ) {
        const userRepository = new UserRepository(dataSource);
        const entity = await userRepository.findOneBy({
            name: 'admin',
        });

        if (!entity) {
            throw new NotFoundError();
        }

        const userAttributeRepository = dataSource.getRepository(UserAttributeEntity);
        const userAttributes = await userAttributeRepository.findBy({
            user_id: entity.id,
        });

        entity.extra = transformUserAttributes(userAttributes);

        permissions = await userRepository.getOwnedPermissions(entity.id);

        request.ability = new AbilityManager(permissions);
        request.scopes = [OAuth2Scope.GLOBAL];

        request.user = entity;
        request.userId = entity.id;
        request.realmId = entity.realm_id;

        return;
    }

    const robotRepository = new RobotRepository(dataSource);
    const robot = await robotRepository.verifyCredentials(header.username, header.password);
    if (robot) {
        // allow authentication but not authorization with basic auth for robots!
        request.ability = new AbilityManager();
        request.scopes = [OAuth2Scope.GLOBAL];

        request.realmId = robot.realm_id;
        request.robot = robot;
        request.robotId = robot.id;
    }

    const oauth2ClientRepository = new OAuth2ClientRepository(dataSource);
    const oauth2Client = await oauth2ClientRepository.verifyCredentials(header.username, header.password);
    if (oauth2Client) {
        // allow authentication but not authorization with basic auth for robots!
        request.ability = new AbilityManager();
        request.scopes = [OAuth2Scope.GLOBAL];

        request.realmId = oauth2Client.realm_id;
        request.clientId = oauth2Client.id;
        request.client = oauth2Client;
    }
}

export async function verifyAuthorizationHeader(
    request: ExpressRequest,
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
