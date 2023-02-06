/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2SubKind, OAuth2TokenGrantResponse,
    RobotError,
    ScopeName,
} from '@authup/common';
import { useRequestBody } from '@routup/body';
import { Request, getRequestIp } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RobotEntity, RobotRepository } from '@authup/server-database';
import { AbstractGrant } from './abstract';
import { buildOAuth2BearerTokenResponse } from '../response';
import { Grant } from './type';

export class RobotCredentialsGrantType extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const entity = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            remoteAddress: getRequestIp(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            subKind: OAuth2SubKind.ROBOT,
            sub: entity.id,
            realmId: entity.realm.id,
            realmName: entity.realm.name,
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.get('tokenMaxAgeAccessToken'),
        });
    }

    async validate(request: Request) : Promise<RobotEntity> {
        const { id, secret } = useRequestBody(request);

        const dataSource = await useDataSource();
        const repository = new RobotRepository(dataSource);
        const entity = await repository.verifyCredentials(id, secret);

        if (!entity) {
            throw RobotError.credentialsInvalid();
        }

        if (!entity.active) {
            throw RobotError.inactive();
        }

        return entity;
    }
}
