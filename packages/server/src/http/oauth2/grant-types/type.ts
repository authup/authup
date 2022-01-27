/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Client, OAuth2TokenResponse, OAuth2TokenSubKind, Realm, Robot, TokenMaxAgeType, User,
} from '@typescript-auth/domains';
import { KeyPairOptions } from '@typescript-auth/server-utils';
import { Client } from 'redis-extension';
import { ExpressRequest } from '../../type';

export type AccessTokenContextUserEntity = {
    kind: OAuth2TokenSubKind.USER,
    data: User | User['id']
};

export type AccessTokenContextRobotEntity = {
    kind: OAuth2TokenSubKind.ROBOT,
    data: Robot | Robot['id']
};

export type IssueAccessTokenContext = {
    entity: AccessTokenContextUserEntity | AccessTokenContextRobotEntity,
    realm: Realm['id'] | Realm,

    scope?: string | string[],
    client?: OAuth2Client['id'] | OAuth2Client,
};

// -----------------------------------------------------

export interface Grant {
    run() : Promise<OAuth2TokenResponse>;
}

export type GrantContext = {
    request: ExpressRequest,
    redis?: Client | string | boolean,

    keyPairOptions?: Partial<KeyPairOptions>,

    maxAge?: TokenMaxAgeType,

    selfUrl: string,
};

// -----------------------------------------------------

export type InternalGrantContext = GrantContext & {
    realm: Realm | Realm['id'],
    entity: AccessTokenContextUserEntity | AccessTokenContextRobotEntity
};
