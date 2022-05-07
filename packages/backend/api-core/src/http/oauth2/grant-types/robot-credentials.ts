/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenResponse,
    OAuth2TokenSubKind, RobotError,
} from '@authelion/common';
import path from 'path';
import { AbstractGrant } from './abstract-grant';
import { OAuth2BearerTokenResponse } from '../response';
import { RobotEntity, RobotRepository } from '../../../domains';
import { Grant } from './type';
import { useDataSource } from '../../../database';

export class RobotCredentialsGrantType extends AbstractGrant implements Grant {
    async run() : Promise<OAuth2TokenResponse> {
        const entity = await this.validate();

        const accessToken = await this.issueAccessToken({
            entity: {
                kind: OAuth2TokenSubKind.ROBOT,
                data: entity,
            },
            realm: entity.realm_id,
        });

        const response = new OAuth2BearerTokenResponse({
            keyPairOptions: {
                directory: path.join(this.context.config.rootPath, this.context.config.writableDirectory),
            },
            accessToken,
        });

        return response.build();
    }

    async validate() : Promise<RobotEntity> {
        const { id, secret } = this.context.request.body;

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
