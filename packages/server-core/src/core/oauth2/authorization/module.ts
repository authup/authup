/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    ScopeName,
} from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    OAuth2AuthorizationResponseType,
    OAuth2Error,
    hasOAuth2Scopes,
} from '@authup/specs';
import type { IOAuth2OpenIDTokenIssuer, IOAuth2TokenIssuer } from '../token';
import type { IOAuth2AuthorizationCodeIssuer } from './code';
import type {
    OAuth2AuthorizationManagerContext,
    OAuth2AuthorizationResult,
} from './types';
import type { IIdentityResolver } from '../../identity';

export class OAuth2Authorization {
    protected accessTokenIssuer : IOAuth2TokenIssuer;

    protected openIdTokenIssuer : IOAuth2OpenIDTokenIssuer;

    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    protected identityResolver : IIdentityResolver;

    constructor(ctx: OAuth2AuthorizationManagerContext) {
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.openIdTokenIssuer = ctx.openIdTokenIssuer;
        this.codeIssuer = ctx.codeIssuer;
        this.identityResolver = ctx.identityResolver;
    }

    /**
     * Authorize with validated codeRequest.
     *
     * @param data
     * @param identity
     */
    async authorize(
        data: OAuth2AuthorizationCodeRequest,
        identity: Identity,
    ) : Promise<OAuth2AuthorizationResult> {
        const availableResponseTypes : string[] = Object.values(OAuth2AuthorizationResponseType);

        let responseTypes : string[] = [];
        if (data.response_type) {
            responseTypes = Array.isArray(data.response_type) ?
                data.response_type :
                data.response_type.split(' ');
        }

        const enabledResponseTypes : Record<string, boolean> = {};

        for (let i = 0; i < responseTypes.length; i++) {
            if (availableResponseTypes.indexOf(responseTypes[i]) === -1) {
                throw OAuth2Error.responseTypeUnsupported();
            } else {
                enabledResponseTypes[responseTypes[i]] = true;
            }
        }

        const output : OAuth2AuthorizationResult = {
            redirectUri: data.redirect_uri,
            ...(data.state ? { state: data.state } : {}),
        };

        const payloadBaseNormalized : OAuth2TokenPayload = {

            sub: identity.data.id,
            sub_kind: identity.type,
            realm_id: identity.data.realm.id,
            realm_name: identity.data.realm.name,

            client_id: data.client_id,
            ...(data.scope ? { scope: data.scope } : {}),
        };

        if (!identity) {
            throw OAuth2Error.identityInvalid();
        }

        let idToken : string | undefined;
        if (
            enabledResponseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] ||
            (
                data.scope &&
                hasOAuth2Scopes(data.scope, ScopeName.OPEN_ID)
            )
        ) {
            const [token] = await this.openIdTokenIssuer.issueWithIdentity(
                payloadBaseNormalized,
                identity,
            );

            idToken = token;

            if (enabledResponseTypes[OAuth2AuthorizationResponseType.ID_TOKEN]) {
                output.idToken = token;
            }
        }

        if (enabledResponseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
            const [token] = await this.accessTokenIssuer.issue(payloadBaseNormalized);

            output.accessToken = token;
        }

        if (enabledResponseTypes[OAuth2AuthorizationResponseType.CODE]) {
            if (identity) {
                const entity = await this.codeIssuer.issue(
                    data,
                    identity,
                    {
                        idToken,
                    },
                );

                output.authorizationCode = entity.id;
            }
        }

        return output;
    }
}
