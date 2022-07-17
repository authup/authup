/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Client, OAuth2TokenResponse, OAuth2TokenSubKind, Realm, Robot, TokenMaxAgeType, User,
} from '@authelion/common';
import { ExpressRequest } from '../../http';

export type AccessTokenContextOAuth2ClientEntity = {
    kind: OAuth2TokenSubKind.CLIENT,
    data: OAuth2Client | OAuth2Client['id']
};

export type AccessTokenContextUserEntity = {
    kind: OAuth2TokenSubKind.USER,
    data: User | User['id']
};

export type AccessTokenContextRobotEntity = {
    kind: OAuth2TokenSubKind.ROBOT,
    data: Robot | Robot['id']
};

export type AccessTokenIssueContext = {
    request: ExpressRequest,

    entity: AccessTokenContextOAuth2ClientEntity |
    AccessTokenContextUserEntity |
    AccessTokenContextRobotEntity,

    realm: Realm['id'] | Realm,

    scope?: string | string[],
    client?: OAuth2Client['id'] | OAuth2Client,
};

// -----------------------------------------------------

export interface Grant {
    run(request: ExpressRequest) : Promise<OAuth2TokenResponse>;
}
