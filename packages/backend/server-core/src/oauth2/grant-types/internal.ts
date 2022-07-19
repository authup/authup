/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope, OAuth2SubKind, OAuth2TokenResponse,
} from '@authelion/common';
import { AbstractGrant } from './abstract';
import {
    Grant,
} from './type';
import { OAuth2BearerTokenResponse } from '../response';
import { ExpressRequest } from '../../http';

export class InternalGrantType extends AbstractGrant implements Grant {
    async run(request: ExpressRequest): Promise<OAuth2TokenResponse> {
        const accessToken = await this.issueAccessToken({
            remoteAddress: request.ip,
            scope: OAuth2Scope.GLOBAL,
            realmId: request.realmId,
            sub: request.userId,
            subKind: OAuth2SubKind.USER,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            refreshToken,
            keyPairOptions: {
                directory: this.config.writableDirectoryPath,
            },
        });

        return response.build();
    }
}
