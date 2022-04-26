/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager,
    HeaderError,
    OAuth2TokenKind,
    OAuth2TokenSubKind, PermissionMeta,
    TokenError,
} from '@authelion/common';
import {
    AuthorizationHeader,
    AuthorizationHeaderType,
    BasicAuthorizationHeader,
    BearerAuthorizationHeader,
} from '@trapi/client';
import { Client } from 'redis-extension';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest } from '../../type';
import { extendOAuth2TokenVerification, verifyOAuth2Token } from '../../oauth2';
import {
    RobotEntity, RobotRepository, UserEntity, UserRepository,
} from '../../../domains';
import { useDataSource } from '../../../database';

type AuthorizationHeaderVerifyOptions = {
    writableDirectoryPath: string,
    redis?: Client | string | boolean
};

async function verifyBearerAuthorizationHeader(
    request: ExpressRequest,
    header: BearerAuthorizationHeader,
    options: AuthorizationHeaderVerifyOptions,
) {
    const token = await verifyOAuth2Token(
        header.token,
        {
            keyPair: {
                directory: options.writableDirectoryPath,
            },
            redis: options.redis,
        },
    );

    if (token.kind !== OAuth2TokenKind.ACCESS) {
        throw TokenError.accessTokenRequired();
    }

    request.token = header.token;
    request.realmId = token.entity.realm_id;

    const tokenExtended = await extendOAuth2TokenVerification(token, { redis: options.redis });

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
    options: AuthorizationHeaderVerifyOptions,
) {
    let permissions : PermissionMeta[] = [];

    const dataSource = await useDataSource();

    if (
        process.env.NODE_ENV === 'test' &&
        header.username === 'admin' &&
        header.password === 'start123'
    ) {
        const userRepository = new UserRepository(dataSource);
        const entity = await userRepository.findOneBy({
            name: 'admin',
        });

        if (!entity) {
            throw new NotFoundError();
        }

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
    options: AuthorizationHeaderVerifyOptions,
) : Promise<void> {
    switch (header.type) {
        case AuthorizationHeaderType.BEARER:
            return verifyBearerAuthorizationHeader(request, header, options);
        case AuthorizationHeaderType.BASIC:
            return verifyBasicAuthorizationHeader(request, header, options);
    }

    throw HeaderError.unsupportedHeaderType(header.type);
}
