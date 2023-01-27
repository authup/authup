/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenKind, OAuth2TokenPayload } from '@authup/common';
import { randomUUID } from 'node:crypto';
import { OAuth2AccessTokenBuilderContext, OAuth2AccessTokenBuilderCreateContext } from './type';

export class Oauth2AccessTokenBuilder {
    // -----------------------------------------------------

    protected context: OAuth2AccessTokenBuilderContext;

    // -----------------------------------------------------

    constructor(context: OAuth2AccessTokenBuilderContext) {
        this.context = context;
    }

    // -----------------------------------------------------

    public async create(
        context: OAuth2AccessTokenBuilderCreateContext,
    ) : Promise<Partial<OAuth2TokenPayload>> {
        return {
            jti: randomUUID(),
            iss: this.context.selfUrl,
            sub: context.sub,
            sub_kind: context.subKind,
            remote_address: context.remoteAddress,
            kind: OAuth2TokenKind.ACCESS,
            aud: context.clientId,
            client_id: context.clientId,
            realm_id: context.realmId,
            realm_name: context.realmName,
            scope: context.scope,
        };
    }
}
