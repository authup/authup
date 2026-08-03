/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import { URL } from 'node:url';

import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    Client,
    OAuth2AuthorizationCodeRequest,
    Realm,
    Scope,
} from '@authup/core-kit';
import { OAuth2AccessDeniedError, OAuth2ErrorCode, isOAuth2AccessDeniedError } from '@authup/specs';
import { ForceUserLoggedInMiddleware } from '../../../middleware/index.ts';
import { HTTPOAuth2Authorizer } from '../../../adapters/index.ts';
import { renderAuthConsolePage } from '../../../ui/index.ts';
import { readFromLocations } from '../../../request/index.ts';
import type { IOAuth2AuthorizationCodeRequestVerifier } from '../../../../../core/index.ts';
import { OAuth2AuthorizationCodeRequestValidator } from '../../../../../core/index.ts';
import type { AuthorizeControllerContext, AuthorizeControllerOptions } from './types.ts';
import { sanitizeError } from '../../../../../utils/index.ts';

type RealmSummary = Pick<Realm, 'id' | 'name' | 'displayName'>;
type ClientSummary = Pick<Client, 'id' | 'name' | 'displayName' | 'builtIn' | 'createdAt'>;

@DController('/authorize')
export class AuthorizeController {
    // todo: maybe /realms/<realm>/protocol/openid-connect/authorize
    // todo: maybe /realms/<realm>/[...]/authorize

    protected options: AuthorizeControllerOptions;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : OAuth2AuthorizationCodeRequestValidator;

    protected authorizer: HTTPOAuth2Authorizer;

    // ---------------------------------------------------------

    constructor(ctx: AuthorizeControllerContext) {
        this.options = ctx.options;

        this.codeRequestVerifier = ctx.codeRequestVerifier;

        this.codeRequestValidator = new OAuth2AuthorizationCodeRequestValidator();

        this.authorizer = new HTTPOAuth2Authorizer({
            codeRequestVerifier: this.codeRequestVerifier,
            codeIssuer: ctx.codeIssuer,
            sessionManager: ctx.sessionManager,
            eventService: ctx.eventService,
            metrics: ctx.metrics,
            promptLoginMaxAge: ctx.options.promptLoginMaxAge,
            mfaFreshnessMaxAge: ctx.options.mfaFreshnessMaxAge,
            mfaChallengeProvider: ctx.mfaChallengeProvider,
            accessPolicyEvaluator: ctx.accessPolicyEvaluator,
            consentService: ctx.consentService,
            logger: ctx.logger,
        });
    }

    // ---------------------------------------------------------

    @DPost('', [ForceUserLoggedInMiddleware])
    async confirm(@DContext() event: IAppEvent): Promise<{ url: string }> {
        try {
            const result = await this.authorizer.authorizeWithRequest(event);

            const url = new URL(result.redirectUri);
            if (result.state) {
                url.searchParams.set('state', result.state);
            }

            if (result.authorizationCode) {
                url.searchParams.set('code', result.authorizationCode);
            }

            return { url: url.href };
        } catch (e) {
            // Access-policy denial (plan 052): with a pattern-verified
            // redirect_uri the denial is answered as an error redirect
            // (RFC 6749 §4.1.2.1) — the kit navigates the returned url like
            // any success. Unverified → rethrow → 400 body → interactive
            // denial card.
            if (isOAuth2AccessDeniedError(e) && e.redirectUri) {
                const url = new URL(e.redirectUri);
                url.searchParams.set('error', OAuth2ErrorCode.ACCESS_DENIED);
                if (e.state) {
                    url.searchParams.set('state', e.state);
                }

                return { url: url.href };
            }

            throw e;
        }
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        let codeRequest : OAuth2AuthorizationCodeRequest | undefined;

        let client : ClientSummary | undefined;
        let scopes : Scope[] | undefined;

        // Target realm summary (the client's realm) — the UI names it in the
        // realm-mismatch notice. codeRequest.realm_id is only the id.
        let realm : RealmSummary | undefined;

        // Whether the request redirect_uri matched a registered client pattern —
        // the UI must not offer an automatic "return to application" redirect to
        // an unverified (pattern-less-client) redirect_uri.
        let redirectUriVerified = false;

        let error : Error | undefined;

        try {
            const merged = await readFromLocations(event, ['body', 'query']);
            const data = await this.codeRequestValidator.run(merged);

            const result = await this.codeRequestVerifier.verify(data);

            // Trim the client to a deliberate DTO before it reaches the
            // anonymous SSR hydration payload — never disclose redirect_uri
            // patterns (the trusted-origin set), grant_types, internal
            // base/root URLs, auth methods, or the secret storage flags to an
            // unauthenticated visitor. (ClientEntity.secret is additionally
            // select:false, so the secret is never loaded — but the DTO must not
            // rely on that alone: a future entity/query change could unset it.)
            client = {
                id: result.client.id,
                name: result.client.name,
                displayName: result.client.displayName,
                builtIn: result.client.builtIn,
                createdAt: result.client.createdAt,
            };
            scopes = result.scopes;
            redirectUriVerified = result.redirectUriVerified;

            if (result.client.realm) {
                realm = {
                    id: result.client.realm.id,
                    name: result.client.realm.name,
                    displayName: result.client.realm.displayName,
                };
            }

            codeRequest = result.data;
        } catch (e) {
            const normalized = sanitizeError(e);
            error = {
                ...normalized,
                message: normalized.message,
            };
        }

        // A recognized `error` query param (the federated-IdP callback
        // redirects back here with error=access_denied on a policy denial)
        // is mapped onto the hydration payload's error — neutral message,
        // never attacker-controlled text.
        if (!error) {
            const query = useRequestQuery(event);
            if (query.error === OAuth2ErrorCode.ACCESS_DENIED) {
                const normalized = sanitizeError(OAuth2AccessDeniedError.forClient());
                error = {
                    ...normalized,
                    message: normalized.message,
                };
            }
        }

        // Path + query of the original request — the SSR page uses it as
        // the same-origin `redirect` parameter on register / password links
        // so those pages can lead back into this authorize request.
        const requestURL = new URL(event.request.url);

        return renderAuthConsolePage(event, {
            url: '/authorize',
            payload: {
                config: { baseURL: this.options.baseURL },
                data: {
                    codeRequest,
                    error,
                    client,
                    scopes,
                    realm,
                    redirectUriVerified,
                    features: this.options.features,
                    requestPath: `${requestURL.pathname}${requestURL.search}`,
                },
            },
        });
    }
}
