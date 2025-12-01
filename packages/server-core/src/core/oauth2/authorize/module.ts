/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    ScopeName,
} from '@authup/core-kit';
import {
    isSimpleMatch,
} from '@authup/kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    OAuth2AuthorizationResponseType, OAuth2Error, hasOAuth2Scopes,
} from '@authup/specs';
import type { IOAuth2ClientRepository } from '../client';
import type { IOAuth2ClientScopeRepository } from '../client-scope';
import type { OAuth2IdentityResolver } from '../identity';
import type { IOAuth2TokenIssuer } from '../token';
import type { IOAuth2AuthorizationCodeIssuer } from './code';
import type {
    OAuth2AuthorizationCodeRequestContainer,
    OAuth2AuthorizationManagerContext,
    OAuth2AuthorizationResult,
} from './types';
import { AuthorizeRequestValidator } from './validation';

export class OAuth2AuthorizationManager {
    protected clientRepository: IOAuth2ClientRepository;

    protected clientScopeRepository: IOAuth2ClientScopeRepository;

    protected validator : AuthorizeRequestValidator;

    protected accessTokenIssuer : IOAuth2TokenIssuer;

    protected openIDIssuer : IOAuth2TokenIssuer;

    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    protected identityResolver : OAuth2IdentityResolver;

    constructor(
        ctx: OAuth2AuthorizationManagerContext,
    ) {
        this.clientRepository = ctx.clientRepository;
        this.clientScopeRepository = ctx.clientScopeRepository;
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.openIDIssuer = ctx.openIdIssuer;
        this.codeIssuer = ctx.codeIssuer;
        this.identityResolver = ctx.identityResolver;

        this.validator = new AuthorizeRequestValidator();
    }

    async authorizeWith(
        codeRequest: OAuth2AuthorizationCodeRequest,
        base: OAuth2TokenPayload = {},
    ) : Promise<OAuth2AuthorizationResult> {
        const { data } = await this.verify(codeRequest);

        const availableResponseTypes : string[] = Object.values(OAuth2AuthorizationResponseType);

        let responseTypes : string[] = [];
        if (data.response_type) {
            responseTypes = Array.isArray(data.response_type) ? data.response_type : data.response_type.split(' ');
        }

        for (let i = 0; i < responseTypes.length; i++) {
            if (availableResponseTypes.indexOf(responseTypes[i]) === -1) {
                throw OAuth2Error.responseTypeUnsupported();
            } else {
                data[responseTypes[i]] = true;
            }
        }

        const output : OAuth2AuthorizationResult = {
            redirectUri: data.redirect_uri,
            ...(data.state ? { state: data.state } : {}),
        };

        const payloadBaseNormalized : OAuth2TokenPayload = {
            ...base,
            client_id: data.client_id,
            ...(data.scope ? { scope: data.scope } : {}),
        };

        let idToken : string | undefined;
        if (
            responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] ||
            (
                data.scope &&
                hasOAuth2Scopes(data.scope, ScopeName.OPEN_ID)
            )
        ) {
            const [token] = await this.openIDIssuer.issue(payloadBaseNormalized);

            idToken = token;

            if (responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN]) {
                output.idToken = token;
            }
        }

        if (responseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
            const [token] = await this.accessTokenIssuer.issue(payloadBaseNormalized);

            output.accessToken = token;
        }

        if (responseTypes[OAuth2AuthorizationResponseType.CODE]) {
            const identity = await this.identityResolver.resolve(payloadBaseNormalized);

            const entity = await this.codeIssuer.issue(
                data,
                identity,
                {
                    idToken,
                },
            );

            output.authorizationCode = entity.id;
        }

        return output;
    }

    /**
     * Validate raw authorization data.
     *
     * @param input
     */
    async validate(input: Record<string, any>) : Promise<OAuth2AuthorizationCodeRequest> {
        return this.validator.run(input);
    }

    /**
     * Verify code request.
     *
     * @param data
     * @protected
     */
    async verify(data: OAuth2AuthorizationCodeRequest) : Promise<OAuth2AuthorizationCodeRequestContainer> {
        const client = await this.clientRepository.findOneByIdOrName(data.client_id, data.realm_id);
        if (!client) {
            throw OAuth2Error.clientInvalid();
        }

        data.client_id = client.id;

        const clientScopes = await this.clientScopeRepository.findByClientId(client.id);
        const scopeNames = clientScopes.map((clientScope) => clientScope.scope.name);
        if (data.scope) {
            if (
                !hasOAuth2Scopes(scopeNames, data.scope) &&
                !hasOAuth2Scopes(data.scope, ScopeName.GLOBAL)
            ) {
                throw OAuth2Error.scopeInsufficient();
            }
        } else {
            data.scope = scopeNames.join(' ');
        }

        if (client.redirect_uri) {
            const redirectUris = client.redirect_uri.split(',');

            // verifying scopes
            if (!isSimpleMatch(data.redirect_uri, redirectUris)) {
                throw OAuth2Error.redirectUriMismatch();
            }
        }

        return {
            data,
            client,
            clientScopes,
        };
    }
}
