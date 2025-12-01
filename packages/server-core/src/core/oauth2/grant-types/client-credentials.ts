/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import {
    OAuth2SubKind,
} from '@authup/specs';
import type { Client } from '@authup/core-kit';
import {
    ScopeName,
} from '@authup/core-kit';
import { BaseGrant } from './base';
import { buildOAuth2BearerTokenResponse } from '../response';

export class ClientCredentialsGrant extends BaseGrant<Client> {
    async runWith(input: Client, base: OAuth2TokenPayload = {}) : Promise<OAuth2TokenGrantResponse> {
        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            ...base,
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
