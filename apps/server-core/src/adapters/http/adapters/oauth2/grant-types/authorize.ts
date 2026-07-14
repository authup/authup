/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2GrantError, OAuth2RequestError, OAuth2TokenGrant } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { OAuth2AuthorizeGrant, assertClientGrantAllowed } from '../../../../../core/index.ts';
import type {
    IOAuth2AccessPolicyEvaluator,
    IOAuth2AuthorizationCodeVerifier,
    IRealmRepository,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import type { HTTPOAuth2AuthorizeGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest, readRealmHint } from './utils/index.ts';

export class HTTPOAuth2AuthorizeGrant extends OAuth2AuthorizeGrant implements IHTTPOAuth2Grant {
    protected codeVerifier : IOAuth2AuthorizationCodeVerifier;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected realmRepository : IRealmRepository;

    protected accessPolicyEvaluator? : IOAuth2AccessPolicyEvaluator;

    constructor(ctx: HTTPOAuth2AuthorizeGrantContext) {
        super(ctx);

        this.codeVerifier = ctx.codeVerifier;
        this.clientAuthenticator = ctx.clientAuthenticator;
        this.realmRepository = ctx.realmRepository;
        this.accessPolicyEvaluator = ctx.accessPolicyEvaluator;
    }

    async runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);
        const query = useRequestQuery(event);

        const code = this.pickStringParam(body, query, 'code');
        const redirectUri = this.pickStringParam(body, query, 'redirect_uri');
        const codeVerifier = this.pickStringParam(body, query, 'code_verifier');
        if (!code) {
            throw OAuth2RequestError.malformed();
        }

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);
        const realm = await this.realmRepository.resolve(readRealmHint(body, query), true);

        const client = await this.clientAuthenticator.authenticate(clientId, clientSecret, realm.id);

        assertClientGrantAllowed(client, OAuth2TokenGrant.AUTHORIZATION_CODE);

        const entity = await this.codeVerifier.verify(code, {
            redirectUri,
            codeVerifier,
            clientId: client.id,
            clientIsPublic: !client.is_confidential,
            realmId: client.realm_id,
        });

        // Application access policy (plan 052), /token backstop: a code
        // minted before the policy was attached (or outside authorize())
        // must not redeem. The subject is built from the code-blob scalars —
        // no DB identity load; attribute-rich policies are enforced at the
        // issuance legs. Denial = invalid_grant, never access_denied here.
        if (client.access_policy_id) {
            let allowed = false;
            if (this.accessPolicyEvaluator) {
                allowed = await this.accessPolicyEvaluator.evaluate(client.access_policy_id, {
                    type: entity.sub_kind,
                    id: entity.sub,
                    realmId: entity.realm_id ?? null,
                    realmName: entity.realm_name ?? null,
                    clientId: entity.client_id ?? null,
                });
            }

            if (!allowed) {
                throw OAuth2GrantError.invalid();
            }
        }

        return this.runWith(entity, {
            ipAddress: getRequestIP(event, { trustProxy: true }) ?? undefined,
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }

    protected pickStringParam(
        body: Record<string, any> | undefined,
        query: Record<string, any> | undefined,
        key: string,
    ): string | undefined {
        const value = body?.[key] ?? query?.[key];
        return typeof value === 'string' && value.length > 0 ? value : undefined;
    }
}
