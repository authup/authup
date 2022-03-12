/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenResponse, Realm } from '@authelion/common';
import { AbstractGrant } from './abstract-grant';
import {
    AccessTokenContextRobotEntity, AccessTokenContextUserEntity, Grant, InternalGrantContext,
} from './type';
import { OAuth2BearerTokenResponse } from '../response';

export class InternalGrantType extends AbstractGrant implements Grant {
    protected entity : AccessTokenContextUserEntity | AccessTokenContextRobotEntity;

    protected realm: Realm['id'] | Realm;

    constructor(context: InternalGrantContext) {
        super(context);

        this.entity = context.entity;
        this.realm = context.realm;
    }

    async run(): Promise<OAuth2TokenResponse> {
        const accessToken = await this.issueAccessToken({
            entity: this.entity,
            realm: this.realm,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            refreshToken,
            keyPairOptions: this.context.keyPairOptions,
        });

        return response.build();
    }
}
