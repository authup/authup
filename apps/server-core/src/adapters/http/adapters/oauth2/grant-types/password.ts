/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2RequestError, OAuth2TokenGrant } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type { ICredentialsAuthenticator, IRealmRepository, OAuth2ClientAuthenticator } from '../../../../../core/index.ts';
import { PasswordGrantType, assertClientGrantAllowed } from '../../../../../core/index.ts';
import type { HTTPOAuth2PasswordGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest, readRealmHint, readStringField } from './utils/index.ts';

export class HTTPPasswordGrant extends PasswordGrantType implements IHTTPOAuth2Grant {
    protected authenticator : ICredentialsAuthenticator<User>;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected realmRepository : IRealmRepository;

    constructor(ctx: HTTPOAuth2PasswordGrantContext) {
        super(ctx);

        this.authenticator = ctx.authenticator;
        this.clientAuthenticator = ctx.clientAuthenticator;
        this.realmRepository = ctx.realmRepository;
    }

    async runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);

        const username = readStringField(body, 'username');
        const password = readStringField(body, 'password');
        if (!username || !password) {
            throw OAuth2RequestError.malformed('username and password must be provided.');
        }

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);

        const realm = await this.realmRepository.resolve(readRealmHint(body), true);

        const client = clientId ?
            await this.clientAuthenticator.authenticate(
                clientId,
                clientSecret,
                realm.id,
            ) :
            undefined;

        if (client) {
            assertClientGrantAllowed(client, OAuth2TokenGrant.PASSWORD);
        }

        const user = await this.authenticator.authenticate(username, password, realm.id);

        return this.runWith(
            { user, client },
            {
                ipAddress: getRequestIP(event, { trustProxy: true }) ?? undefined,
                userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
            },
        );
    }
}
