/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenResponse, Realm } from '@authelion/common';
import path from 'path';
import { AbstractGrant } from './abstract';
import {
    AccessTokenContextRobotEntity, AccessTokenContextUserEntity, Grant,
} from './type';
import { OAuth2BearerTokenResponse } from '../response';
import { ExpressRequest } from '../../type';

export class InternalGrantType extends AbstractGrant implements Grant {
    protected entity : AccessTokenContextUserEntity | AccessTokenContextRobotEntity;

    protected realm: Realm['id'] | Realm;

    // ----------------------------------------------------------------------------

    setRealm(realm: Realm['id'] | Realm) : this {
        this.realm = realm;

        return this;
    }

    setEntity(entity: AccessTokenContextUserEntity | AccessTokenContextRobotEntity) : this {
        this.entity = entity;

        return this;
    }

    // ----------------------------------------------------------------------------

    async run(request: ExpressRequest): Promise<OAuth2TokenResponse> {
        const accessToken = await this.issueAccessToken({
            request,
            entity: this.entity,
            realm: this.realm,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            refreshToken,
            keyPairOptions: {
                directory: path.join(this.config.rootPath, this.config.writableDirectory),
            },
        });

        return response.build();
    }
}
