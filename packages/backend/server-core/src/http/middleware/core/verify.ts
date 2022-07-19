/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityDescriptor,
    AbilityManager,
    HeaderError, OAuth2SubKind,
    OAuth2TokenKind, TokenError,
} from '@authelion/common';
import {
    AuthorizationHeader,
    AuthorizationHeaderType,
    BasicAuthorizationHeader,
    BearerAuthorizationHeader,
} from '@trapi/client';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest } from '../../type';
import { getOAuth2TokenSubMeta, validateOAuth2Token } from '../../../oauth2';
import {
    RobotEntity, RobotRepository, UserAttributeEntity, UserEntity, UserRepository, transformUserAttributes,
} from '../../../domains';
import { buildDatabaseOptionsFromConfig, useDataSource } from '../../../database';
import { useConfig } from '../../../config';

async function verifyBearerAuthorizationHeader(
    request: ExpressRequest,
    header: BearerAuthorizationHeader,
) {
    const token = await validateOAuth2Token(header.token);

    if (token.kind !== OAuth2TokenKind.ACCESS) {
        throw TokenError.accessTokenRequired();
    }

    request.token = header.token;
    request.realmId = token.entity.realm_id;

    const sub = await getOAuth2TokenSubMeta(token);

    request.ability = new AbilityManager(sub.permissions);

    switch (sub.kind) {
        case OAuth2SubKind.USER: {
            request.user = sub.entity as UserEntity;
            request.userId = sub.entity.id;
            break;
        }
        case OAuth2SubKind.ROBOT: {
            request.robot = sub.entity as RobotEntity;
            request.robotId = sub.entity.id;
            request.userId = sub.entity.user_id;
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

    // todo: OAuth2 client verification ?

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

        request.user = entity;
        request.userId = entity.id;
        request.realmId = entity.realm_id;
        request.ability = new AbilityManager(permissions);

        return;
    }

    const robotRepository = new RobotRepository(dataSource);
    const robot = await robotRepository.verifyCredentials(header.username, header.password);
    if (robot) {
        // allow authentication but not authorization with basic auth for robots!
        request.ability = new AbilityManager([]);

        request.realmId = robot.realm_id;
        request.robot = robot;
        request.robotId = robot.id;
        request.userId = robot.user_id;
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
