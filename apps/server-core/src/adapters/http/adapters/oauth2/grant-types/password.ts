/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2RequestError } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type { ICredentialsAuthenticator, IRealmRepository, OAuth2ClientAuthenticator } from '../../../../../core/index.ts';
import { PasswordGrantType } from '../../../../../core/index.ts';
import type { HTTPOAuth2PasswordGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest, readStringField } from './utils/index.ts';

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

        // canonical identifier form: realm names are stored LOWER(TRIM(...))
        const realmHint = [
            readStringField(body, 'realm_id'),
            readStringField(body, 'realm_name'),
        ]
            .map((value) => value?.trim().toLowerCase())
            .find((value) => !!value);

        const realm = await this.realmRepository.resolve(realmHint, true);

        const client = clientId ?
            await this.clientAuthenticator.authenticate(
                clientId,
                clientSecret,
                realm.id,
            ) :
            undefined;

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
