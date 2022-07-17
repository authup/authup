/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope,
    OAuth2TokenResponse,
    OAuth2TokenSubKind, RobotError,
} from '@authelion/common';
import { AbstractGrant } from './abstract';
import { OAuth2BearerTokenResponse } from '../response';
import { RobotEntity, RobotRepository } from '../../domains';
import { Grant } from './type';
import { useDataSource } from '../../database';
import { ExpressRequest } from '../../http';
import { buildKeyPairOptionsFromConfig } from '../../utils';

export class RobotCredentialsGrantType extends AbstractGrant implements Grant {
    async run(request: ExpressRequest) : Promise<OAuth2TokenResponse> {
        const entity = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            request,
            scope: OAuth2Scope.GLOBAL,
            entity: {
                kind: OAuth2TokenSubKind.ROBOT,
                data: entity,
            },
            realm: entity.realm_id,
        });

        const keyPairOptions = buildKeyPairOptionsFromConfig(this.config);
        const response = new OAuth2BearerTokenResponse({
            keyPairOptions,
            accessToken,
        });

        return response.build();
    }

    async validate(request: ExpressRequest) : Promise<RobotEntity> {
        const { id, secret } = request.body;

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
