/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import {
    ScopeName,
} from '@authup/core-kit';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import type { RobotEntity } from '../../../database/domains';
import { RobotAuthenticationService } from '../../../services';
import { BaseGrant } from './base';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { IGrant } from './type';

export class RobotCredentialsGrantType extends BaseGrant implements IGrant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const entity = await this.validate(request);

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            remote_address: getRequestIP(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            sub_kind: OAuth2SubKind.ROBOT,
            sub: entity.id,
            realm_id: entity.realm.id,
            realm_name: entity.realm.name,
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
        });
    }

    async validate(request: Request) : Promise<RobotEntity> {
        const {
            id,
            secret,
            realm_id: realmId,
        } = useRequestBody(request);

        const authenticationService = new RobotAuthenticationService();
        return authenticationService.authenticate(id, secret, realmId);
    }
}
