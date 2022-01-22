/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AccessTokenSubKind, Oauth2Client, Oauth2TokenResponse, Robot, User,
} from '@typescript-auth/domains';
import { ExpressRequest } from '../../type';
import { KeyPairOptions } from '../../../utils';

export type IssueAccessTokenContextUserEntity = {
    type: OAuth2AccessTokenSubKind.USER,
    data: User | User['id']
};

export type IssueAccessTokenContextRobotEntity = {
    type: OAuth2AccessTokenSubKind.ROBOT,
    data: Robot | Robot['id']
};

export type IssueAccessTokenContext = {
    entity: IssueAccessTokenContextUserEntity | IssueAccessTokenContextRobotEntity
    scope?: string | string[],
    client?: Oauth2Client['id'] | Oauth2Client
};

export interface Grant {
    run() : Promise<Oauth2TokenResponse>;
}

export type GrantContext = {
    request: ExpressRequest,
    keyPairOptions?: Partial<KeyPairOptions>,
    maxAge?: number,
    selfUrl: string
};
