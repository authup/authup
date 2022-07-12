/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityConfig,
    AbilityManager,
    HeaderError,
    OAuth2TokenKind, OAuth2TokenSubKind,
    TokenError,
} from '@authelion/common';
import {
    AuthorizationHeader,
    AuthorizationHeaderType,
    BasicAuthorizationHeader,
    BearerAuthorizationHeader,
} from '@trapi/client';
import { NotFoundError } from '@typescript-error/http';
import path from 'path';
import { ExpressRequest } from '../../type';
import { extendOAuth2Token, validateOAuth2Token } from '../../oauth2';
import {
    RobotEntity, RobotRepository, UserAttributeEntity, UserEntity, UserRepository, transformUserAttributes,
} from '../../../domains';
import { useDataSource } from '../../../database';
import { Config, useConfig } from '../../../config';

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

    const tokenExtended = await extendOAuth2Token(token);

    request.ability = new AbilityManager(tokenExtended.target.permissions);

    switch (tokenExtended.target.kind) {
        case OAuth2TokenSubKind.USER: {
            request.user = tokenExtended.target.entity as UserEntity;
            request.userId = tokenExtended.target.entity.id;
            break;
        }
        case OAuth2TokenSubKind.ROBOT: {
            request.robot = tokenExtended.target.entity as RobotEntity;
            request.robotId = tokenExtended.target.entity.id;
            request.userId = tokenExtended.target.entity.user_id;
            break;
        }
    }
}

async function verifyBasicAuthorizationHeader(
    request: ExpressRequest,
    header: BasicAuthorizationHeader,
) {
    let permissions : AbilityConfig[] = [];

    const config = await useConfig();
    const dataSource = await useDataSource();

    if (
        config.env === 'test' &&
        header.username === config.database.seed.admin.username &&
        header.password === config.database.seed.admin.password
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
