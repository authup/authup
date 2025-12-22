/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import {
    OAuth2SubKind,
} from '@authup/specs';
import type { Client } from '@authup/core-kit';
import {
    ScopeName,
} from '@authup/core-kit';
import type { ISessionRepository } from '../../authentication';
import { BaseGrant } from './base';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { OAuth2GrantRunWIthOptions } from './types';

export class ClientCredentialsGrant extends BaseGrant<Client> {
    protected sessionRepository: ISessionRepository;

    async runWith(input: Client, options: OAuth2GrantRunWIthOptions = {}) : Promise<OAuth2TokenGrantResponse> {
        const session = await this.sessionRepository.save({
            user_agent: options.userAgent,
            ip_address: options.ipAddress,
            realm_id: input.realm_id,
            client_id: input.id,
        });

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            session_id: session.id,
            scope: ScopeName.GLOBAL,
            sub: input.id,
            sub_kind: OAuth2SubKind.CLIENT,
            realm_id: input.realm.id,
            realm_name: input.realm.id,
            client_id: input.id,
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
        });
    }
}
