/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    JWTPayload,
    OAuth2Client,
    OAuth2TokenKind,
    Realm,
    User,
} from '@authelion/common';
import { signToken } from '@authelion/server-utils';
import { OpenIdTokenBuilderContext } from './type';

export class OAuth2OpenIdTokenBuilder {
    protected context: OpenIdTokenBuilderContext;

    // -----------------------------------------------------

    protected client?: OAuth2Client | OAuth2Client['id'];

    protected user?: User | User['id'];

    protected realm?: Realm | Realm['id'];

    protected expires?: Date;

    protected scope: string[] = [];

    // -----------------------------------------------------

    constructor(context: OpenIdTokenBuilderContext) {
        this.context = context;
    }

    // -----------------------------------------------------

    public async buildToken(claims: Record<string, any> = {}) : Promise<string> {
        const tokenPayload: Partial<JWTPayload> = {
            iss: this.context.selfUrl,
            sub: this.context.userId,
            remote_address: this.context.request.ip,
            kind: OAuth2TokenKind.ID_TOKEN,
            aud: this.context.clientId,
            client_id: this.context.clientId,
            realm_id: this.context.realmId,
            ...claims,
        };

        return signToken(
            tokenPayload,
            {
                keyPair: this.context.keyPairOptions,
                options: {
                    expiresIn: this.context.maxAge,
                },
            },
        );
    }

    // -----------------------------------------------------
}
